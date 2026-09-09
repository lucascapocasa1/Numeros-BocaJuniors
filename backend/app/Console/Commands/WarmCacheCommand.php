<?php

namespace App\Console\Commands;

use App\Models\Contract;
use App\Models\Right;
use App\Models\Rumor;
use App\Models\Setting;
use App\Services\BeSoccerService;
use Illuminate\Console\Command;

class WarmCacheCommand extends Command
{
    protected $signature = 'besoccer:warm-cache';
    protected $description = 'Pre-warms BeSoccer API cache after deployment';

    public function __construct(private BeSoccerService $besoccer)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        if (!$this->besoccer->isEnabled()) {
            $this->warn('BeSoccer service is disabled. Skipping cache warm-up.');
            return 0;
        }

        $teamId = Setting::get('besoccer_team_id');
        if (!$teamId) {
            $this->warn('besoccer_team_id not configured. Skipping cache warm-up.');
            return 0;
        }

        $this->info('Warming BeSoccer cache...');

        $this->line('  → Team data');
        $teamResult = $this->besoccer->getTeam($teamId);

        // Collect all unique external IDs across every source
        $squadIds = collect($teamResult['data']['team']['squad'] ?? [])
            ->pluck('id')
            ->filter()
            ->map(fn($id) => (string) $id);

        $rumorIds   = Rumor::whereNotNull('external_id')->pluck('external_id');
        $rightIds   = Right::whereNotNull('external_id')->pluck('external_id');
        $contractIds = Contract::whereNotNull('external_id')->pluck('external_id');

        $allIds = $squadIds
            ->merge($rumorIds)
            ->merge($rightIds)
            ->merge($contractIds)
            ->unique()
            ->values();

        $count = $allIds->count();
        $this->line("  → Player data ({$count} unique players: squad + rumors + rights + contracts)");

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($allIds as $id) {
            $this->besoccer->getPlayerData($id);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        $this->info('Cache warm-up complete.');
        return 0;
    }
}
