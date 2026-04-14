<?php

use App\Core\View;

$projects = array_slice(PROJECTS, 0, 2);

View::component('hero', 'index/about/components');
View::component('mission', 'index/about/components');
View::component('certificates', 'index/about/components');
View::component('evolution', 'index/about/components');
View::component('tech-stack', 'index/about/components');
View::component('portfolio', 'index/components', ['projects' => $projects, 'show_all_link' => true]);
View::component('call-to-action', 'index/about/components');
