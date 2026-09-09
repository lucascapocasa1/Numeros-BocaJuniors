<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Migrate links from ["url"] to [{"url": "...", "official": false}]
        foreach (['contracts', 'economy_records'] as $table) {
            DB::table($table)->whereNotNull('links')->orderBy('id')->each(function ($row) use ($table) {
                $links = json_decode($row->links, true);
                if (!is_array($links) || empty($links)) {
                    return;
                }

                $migrated = array_map(function ($link) {
                    if (is_string($link)) {
                        return ['url' => $link, 'official' => false];
                    }
                    return $link; // already an object, leave as-is
                }, $links);

                DB::table($table)->where('id', $row->id)->update(['links' => json_encode($migrated)]);
            });
        }

        Schema::table('contracts', function (Blueprint $table) {
            $table->dropIndex(['official']);
            $table->dropColumn('official');
        });

        Schema::table('economy_records', function (Blueprint $table) {
            $table->dropIndex(['official']);
            $table->dropColumn('official');
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            $table->boolean('official')->default(false)->after('currency');
            $table->index('official');
        });

        Schema::table('economy_records', function (Blueprint $table) {
            $table->boolean('official')->default(false)->after('record_date');
            $table->index('official');
        });

        // Restore links from [{"url": "...", "official": false}] to ["url"]
        foreach (['contracts', 'economy_records'] as $table) {
            DB::table($table)->whereNotNull('links')->orderBy('id')->each(function ($row) use ($table) {
                $links = json_decode($row->links, true);
                if (!is_array($links) || empty($links)) {
                    return;
                }

                $restored = array_map(fn($link) => is_array($link) ? ($link['url'] ?? $link) : $link, $links);

                DB::table($table)->where('id', $row->id)->update(['links' => json_encode($restored)]);
            });
        }
    }
};
