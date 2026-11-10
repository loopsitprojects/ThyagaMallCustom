<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The app timezone changed from UTC to Asia/Colombo (UTC+05:30). Dates are stored
 * as wall-clock values in the app timezone, so every existing value is moved
 * forward 5h30 to keep pointing at the same moment.
 */
return new class extends Migration
{
    private const OFFSET_MINUTES = 330;

    public function up(): void
    {
        $this->shift(self::OFFSET_MINUTES);
    }

    public function down(): void
    {
        $this->shift(-self::OFFSET_MINUTES);
    }

    private function shift(int $minutes): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        $columns = DB::select(
            "SELECT table_name AS table_name, column_name AS column_name FROM information_schema.columns
             WHERE table_schema = DATABASE() AND data_type IN ('timestamp', 'datetime') AND table_name <> 'migrations'"
        );

        foreach (collect($columns)->groupBy('table_name') as $table => $tableColumns) {
            $assignments = $tableColumns
                ->map(fn ($column) => "`{$column->column_name}` = `{$column->column_name}` + INTERVAL {$minutes} MINUTE")
                ->implode(', ');

            DB::statement("UPDATE `{$table}` SET {$assignments}");
        }
    }
};
