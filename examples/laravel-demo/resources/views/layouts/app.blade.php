<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>LaraSelector demo</title>
  <style>.shell{max-width:900px;margin:2rem auto;font-family:system-ui}.nav{display:flex;gap:1rem}.card{border:1px solid #ddd;padding:1rem;margin:1rem 0}</style>
</head>
<body>
<main class="shell">
  <nav class="nav"><a href="/">Dashboard</a><a href="/orders">Orders</a></nav>
  @yield('content')
</main>
<script>window.demoReady = true;</script>
</body>
</html>
