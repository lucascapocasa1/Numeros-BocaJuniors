<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use League\Csv\Writer;
use App\Models\EconomyRecord;
use App\Models\Contract;

class ExportCsvCommand extends Command
{
    protected $signature = 'export:csv {table : Table to export (economy_records|contracts)}';
    protected $description = 'Export a table to CSV';

    public function handle(): int
    {
        $table = $this->argument('table');

        $model = match ($table) {
            'economy_records' => EconomyRecord::class,
            'contracts'       => Contract::class,
            default           => null,
        };

        if ($model === null) {
            $this->error("Tabla no soportada: {$table}. Usar: economy_records o contracts");
            return 1;
        }

        $records = $model::all();

        if ($records->isEmpty()) {
            $this->warn("No hay registros en {$table}");
            return 0;
        }

        $csv = Writer::createFromString();
        $csv->insertOne(array_keys($records->first()->toArray()));

        foreach ($records as $record) {
            $row = $record->toArray();
            $row = array_map(function ($value) {
                return is_array($value) ? json_encode($value) : $value;
            }, $row);
            $csv->insertOne($row);
        }

        $filename = storage_path("app/{$table}_" . date('Y-m-d_His') . '.csv');
        file_put_contents($filename, $csv->toString());

        $this->info("Exportado: {$filename}");
        return 0;
    }
}
