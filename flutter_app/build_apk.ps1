$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio3\jbr'
$env:PATH = "$($env:JAVA_HOME)\bin;" + $env:PATH
$env:GRADLE_USER_HOME = 'D:\.gradle'
$env:TEMP = 'D:\temp'
$env:TMP = 'D:\temp'
$env:ANDROID_USER_HOME = 'D:\.android'

Write-Host "Using JAVA_HOME: $env:JAVA_HOME"
Write-Host "Using GRADLE_USER_HOME: $env:GRADLE_USER_HOME"
Write-Host "Starting flutter build apk..."
flutter build apk
