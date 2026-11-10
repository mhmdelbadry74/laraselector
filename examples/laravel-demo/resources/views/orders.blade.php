@extends('layouts.app')
@section('content')
<h1>Orders</h1>
<table><thead><tr><th>Number</th><th>Status</th></tr></thead><tbody>
@foreach(['A-100','A-101','A-102'] as $order)
<tr><td>{{ $order }}</td><td>Ready</td></tr>
@endforeach
</tbody></table>
@endsection
