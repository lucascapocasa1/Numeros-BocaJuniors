<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddKindAndMetricToElectionCommitments extends Migration
{
    public function up()
    {
        Schema::table('election_commitments', function (Blueprint $table) {
            $table->enum('kind', ['compromiso', 'meta'])->default('compromiso')->after('election_proposal_id');
            $table->decimal('metric_value', 15, 2)->nullable()->after('description');
            $table->string('metric_unit', 100)->nullable()->after('metric_value');
            $table->string('deadline', 100)->nullable()->after('metric_unit');
        });
    }

    public function down()
    {
        Schema::table('election_commitments', function (Blueprint $table) {
            $table->dropColumn(['kind', 'metric_value', 'metric_unit', 'deadline']);
        });
    }
}
