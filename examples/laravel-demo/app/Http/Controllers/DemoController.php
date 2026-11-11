<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
final class DemoController { public function index(){return view('dashboard');} public function store(Request $request){return redirect('/');} public function update(Request $request,string $order){return redirect('/orders');} }
