<?php
namespace LaraSelector\Tests;
use LaraSelector\Activation;
class ActivationTest extends TestCase {
 public function test_local_and_dev_can_be_active():void { $this->app['config']->set('laraselector.enabled',true); $this->app['config']->set('laraselector.environments',['local','dev']); $this->app['env']='local'; $this->assertTrue(app(Activation::class)->active()); $this->app['env']='dev'; $this->assertTrue(app(Activation::class)->active()); }
 public function test_disabled_and_production_are_denied():void { $this->app['config']->set('laraselector.enabled',false); $this->assertFalse(app(Activation::class)->active()); $this->app['config']->set('laraselector.enabled',true); $this->app['config']->set('laraselector.environments',['production']); $this->app['env']='production'; $this->assertFalse(app(Activation::class)->active()); }
}
