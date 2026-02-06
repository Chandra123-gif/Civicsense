// Supabase Edge Function for SLA Escalation
// Deploy with: supabase functions deploy check-sla-escalations
// Schedule with: Supabase Dashboard > Database > Extensions > pg_cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EscalationResult {
    report_id: string;
    from_level: number;
    to_level: number;
    reason: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client with service role key
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get all active reports with SLA configuration
        const { data: activeReports, error: fetchError } = await supabase
            .from('civic_reports')
            .select(`
        id,
        title,
        priority,
        escalation_level,
        created_at,
        sla_due_at,
        user_id,
        assigned_to
      `)
            .in('status', ['pending', 'in_progress', 'reopened'])
            .not('sla_due_at', 'is', null)

        if (fetchError) {
            throw fetchError
        }

        // Get SLA configuration
        const { data: slaConfigs, error: slaError } = await supabase
            .from('sla_config')
            .select('*')

        if (slaError) {
            throw slaError
        }

        // Create lookup map for SLA configs
        const slaMap = new Map(slaConfigs?.map(s => [s.priority, s]) || [])

        const escalations: EscalationResult[] = []
        const now = new Date()

        for (const report of activeReports || []) {
            const slaConfig = slaMap.get(report.priority)
            if (!slaConfig) continue

            const createdAt = new Date(report.created_at)
            const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

            let newLevel = report.escalation_level

            // Check escalation thresholds
            if (hoursElapsed > slaConfig.escalation_level_2_hours && report.escalation_level < 2) {
                newLevel = 2
            } else if (hoursElapsed > slaConfig.escalation_level_1_hours && report.escalation_level < 1) {
                newLevel = 1
            }

            // If escalation needed
            if (newLevel > report.escalation_level) {
                // Update report
                const { error: updateError } = await supabase
                    .from('civic_reports')
                    .update({ escalation_level: newLevel })
                    .eq('id', report.id)

                if (updateError) {
                    console.error(`Failed to update report ${report.id}:`, updateError)
                    continue
                }

                // Create escalation record
                const reason = newLevel === 2
                    ? `SLA Level 2 breach - ${Math.round(hoursElapsed)}h elapsed (threshold: ${slaConfig.escalation_level_2_hours}h)`
                    : `SLA Level 1 breach - ${Math.round(hoursElapsed)}h elapsed (threshold: ${slaConfig.escalation_level_1_hours}h)`

                const { error: escalationError } = await supabase
                    .from('escalations')
                    .insert({
                        report_id: report.id,
                        from_level: report.escalation_level,
                        to_level: newLevel,
                        reason: reason,
                    })

                if (escalationError) {
                    console.error(`Failed to create escalation for ${report.id}:`, escalationError)
                    continue
                }

                escalations.push({
                    report_id: report.id,
                    from_level: report.escalation_level,
                    to_level: newLevel,
                    reason: reason,
                })

                // TODO: Send notifications to appropriate officers
                // This would integrate with notification service
                console.log(`Escalated report ${report.id} from level ${report.escalation_level} to ${newLevel}`)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: activeReports?.length || 0,
                escalated: escalations.length,
                escalations: escalations,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        console.error('Error in SLA escalation check:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

/*
 * To schedule this function to run every hour, add a pg_cron job:
 * 
 * -- Enable pg_cron extension (if not already enabled)
 * CREATE EXTENSION IF NOT EXISTS pg_cron;
 * 
 * -- Schedule the function to run every hour
 * SELECT cron.schedule(
 *   'check-sla-escalations',
 *   '0 * * * *',  -- Every hour at minute 0
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-sla-escalations',
 *     headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
 *     body := '{}'::jsonb
 *   );
 *   $$
 * );
 */
