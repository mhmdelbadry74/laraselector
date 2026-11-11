@extends('layouts.app')
@section('content')
<h1>LaraSelector dashboard</h1>
@include('partials.notice')
<x-card>
  <x-slot:title>Default slot inside a class component</x-slot:title>
  <p>This body is a default slot; it maps to this invocation template.</p>
</x-card>
<x-button
  class="primary"
  data-purpose="multiline-example">
  Anonymous component button
</x-button>
@if(true)
<p class="conditional">Conditional content is present.</p>
@endif
@endsection
<form method="POST" action="{{ route('orders.store') }}">
    @csrf
    <button type="submit">Create order</button>
</form>
<form method="POST" action="{{ route('orders.update', ['order' => 1]) }}">
    @csrf @method('PUT')
    <button type="submit">Update order</button>
    <button type="submit" formaction="{{ route('orders.store') }}" formmethod="POST">Create instead</button>
</form>
