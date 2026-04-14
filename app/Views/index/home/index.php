<?php

use App\Core\View;

$projects = array_slice(PROJECTS, 0, 2);

View::component('hero', 'index/home/components');
View::component('about', 'index/home/components');
View::component('services', 'index/home/components');
View::component('infrastructure-and-security', 'index/home/components');
View::component('speed-and-optimization', 'index/home/components');
View::component('portfolio', 'index/components', ['projects' => $projects, 'show_all_link' => true]);
View::component('call-to-action', 'index/components');
