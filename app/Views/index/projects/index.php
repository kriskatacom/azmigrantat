<?php

use App\Core\View;

View::component('hero', 'index/projects/components');
View::component('portfolio', 'index/components', ['projects' => PROJECTS]);
