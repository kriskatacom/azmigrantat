<?php

use App\Core\View;

$projects = array_slice(PROJECTS, 0, 2);

View::component('hero', 'index/cities/dupnica/components');
View::component('advantages', 'index/cities/dupnica/components');
View::component('hosting-and-domain', 'index/cities/dupnica/components');
View::component('gdpr', 'index/cities/dupnica/components');
View::component('prices', 'index/cities/dupnica/components');
View::component('portfolio', 'index/components', ['projects' => $projects, 'show_all_link' => true]);
View::component('call-to-action', 'index/components');
