<?php

use App\Core\View;

$projects = array_slice(PROJECTS, 0, 2);

View::component('hero', 'index/services/website-development/components');
View::component('infrastructure-and-security', 'index/services/website-development/components');
View::component('work-process', 'index/services/website-development/components');
View::component('maintenance', 'index/services/website-development/components');
View::component('faq', 'index/services/website-development/components');
View::component('portfolio', 'index/components', ['projects' => $projects, 'show_all_link' => true]);
View::component('call-to-action', 'index/services/website-development/components');
