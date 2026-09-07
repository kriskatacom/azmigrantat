Pod::Spec.new do |s|
  s.name           = 'CardOcr'
  s.version        = '1.0.0'
  s.summary        = 'On-device OCR for payment card scans'
  s.description    = 'Reads printed text from a card photo using Apple Vision.'
  s.license        = 'UNLICENSED'
  s.author         = 'azmigrantat'
  s.homepage       = 'https://github.com/expo/expo'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
  s.frameworks = 'Vision', 'UIKit'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
