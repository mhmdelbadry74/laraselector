<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DemoController;
use App\Http\Controllers\InvokableDemoController;
Route::get('/', [DemoController::class, 'index'])->name('dashboard');
Route::post('/orders', [DemoController::class, 'store'])->name('orders.store');
Route::put('/orders/{order}', [DemoController::class, 'update'])->name('orders.update');
Route::get('/invokable', InvokableDemoController::class)->name('invokable');
Route::get('/closure-demo', fn () => view('dashboard'))->name('closure-demo');
