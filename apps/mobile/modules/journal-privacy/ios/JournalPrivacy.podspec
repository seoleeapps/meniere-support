Pod::Spec.new do |s|
  s.name = 'JournalPrivacy'
  s.version = '1.0.0'
  s.summary = 'Exclude local health records from system backups'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'Seolee Apps'
  s.homepage = 'https://github.com/seoleeapps/meniere-support'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/seoleeapps/meniere-support.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
