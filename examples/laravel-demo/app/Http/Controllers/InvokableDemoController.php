<?php
namespace App\Http\Controllers;
final class InvokableDemoController { public function __invoke(){return view('orders');} }
