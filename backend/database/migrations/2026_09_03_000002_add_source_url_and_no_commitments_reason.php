<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSourceUrlAndNoCommitmentsReason extends Migration
{
    public function up()
    {
        Schema::table('election_lists', function (Blueprint $table) {
            $table->string('source_url', 500)->nullable()->after('name');
        });

        Schema::table('election_proposals', function (Blueprint $table) {
            $table->text('no_commitments_reason')->nullable()->after('description');
        });
    }

    public function down()
    {
        Schema::table('election_lists', function (Blueprint $table) {
            $table->dropColumn('source_url');
        });

        Schema::table('election_proposals', function (Blueprint $table) {
            $table->dropColumn('no_commitments_reason');
        });
    }
}
