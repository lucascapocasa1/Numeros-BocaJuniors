<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Laravel\Lumen\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected $commands = [
        Commands\ExportCsvCommand::class,
        Commands\MonitorXAccountsCommand::class,
        Commands\WarmCacheCommand::class,
    ];

    protected function schedule(Schedule $schedule): void
    {
        //$schedule->command('twitter:monitor --dry-run')
        //    ->dailyAt('08:10')
        //    ->appendOutputTo(storage_path('logs/twitter-monitor.log'));
    }
}
