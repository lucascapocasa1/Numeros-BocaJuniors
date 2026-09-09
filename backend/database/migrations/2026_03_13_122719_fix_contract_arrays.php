<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $contracts = DB::table('contracts')->get();

        foreach ($contracts as $contract) {
            $clauses = $this->fixJsonField($contract->clauses);
            $links = $this->fixJsonField($contract->links);

            DB::table('contracts')
                ->where('id', $contract->id)
                ->update([
                    'clauses' => $clauses,
                    'links'   => $links,
                ]);
        }
    }

    public function down(): void
    {
    }

    private function fixJsonField(mixed $value): ?array
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_array($value)) {
            return $value;
        }

        $decoded = json_decode($value, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        return null;
    }
};
