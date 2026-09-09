<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('election_lists', function (Blueprint $table) {
            $table->string('slug', 255)->nullable()->unique()->after('token');
        });

        // Backfill slugs for lists created before this column existed.
        $existingSlugs = DB::table('election_lists')->whereNotNull('slug')->pluck('slug')->all();

        DB::table('election_lists')->whereNull('slug')->orderBy('id')->get(['id', 'name'])->each(function ($list) use (&$existingSlugs) {
            $base = Str::slug($list->name) ?: 'lista';
            $slug = $base;
            $suffix = 2;
            while (in_array($slug, $existingSlugs, true)) {
                $slug = $base . '-' . $suffix;
                $suffix++;
            }
            $existingSlugs[] = $slug;

            DB::table('election_lists')->where('id', $list->id)->update(['slug' => $slug]);
        });
    }

    public function down(): void
    {
        Schema::table('election_lists', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
