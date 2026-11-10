<?php

header('Content-Type: text/plain; charset=UTF-8');
echo 'PHP VERSION: ' . PHP_VERSION . "\n";
echo 'DOCUMENT_ROOT: ' . ($_SERVER['DOCUMENT_ROOT'] ?? '') . "\n";
echo 'SCRIPT_FILENAME: ' . ($_SERVER['SCRIPT_FILENAME'] ?? '') . "\n";
echo 'REQUEST_URI: ' . ($_SERVER['REQUEST_URI'] ?? '') . "\n";

$errorLog = __DIR__ . '/error_log';
if (file_exists($errorLog)) {
    echo "\n=== ERROR LOG (LAST 40 LINES) ===\n";
    $lines = file($errorLog);
    $lastLines = array_slice($lines, -40);
    echo implode('', $lastLines);
} else {
    echo "\nNo error_log found at " . $errorLog . "\n";
}
