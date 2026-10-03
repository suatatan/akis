!macro AkisFileVerb EXT
  WriteRegStr HKLM "Software\Classes\SystemFileAssociations\.${EXT}\shell\Akis" "" "Akis ile yaz"
  WriteRegStr HKLM "Software\Classes\SystemFileAssociations\.${EXT}\shell\Akis" "Icon" "$INSTDIR\Akis.exe,0"
  WriteRegStr HKLM "Software\Classes\SystemFileAssociations\.${EXT}\shell\Akis\command" "" '"$INSTDIR\Akis.exe" "%1"'
!macroend
!macro customInstall
  !insertmacro AkisFileVerb "md"
  !insertmacro AkisFileVerb "markdown"
  !insertmacro AkisFileVerb "mdown"
!macroend
!macro customUnInstall
  DeleteRegKey HKLM "Software\Classes\SystemFileAssociations\.md\shell\Akis"
  DeleteRegKey HKLM "Software\Classes\SystemFileAssociations\.markdown\shell\Akis"
  DeleteRegKey HKLM "Software\Classes\SystemFileAssociations\.mdown\shell\Akis"
!macroend

