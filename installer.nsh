; Custom installer script for GPTWhats
; This script customizes the NSIS installer

!define PRODUCT_NAME "GPTWhats"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "GPTWhats"

; Custom pages
Page custom showWelcomePage
Page custom showRequirementsPage

; Welcome page
Function showWelcomePage
  !insertmacro MUI_HEADER_TEXT "Bem-vindo ao GPTWhats!" "Instalador do Bot de WhatsApp com IA"
  
  nsDialogs::Create 1018
  Pop $0
  
  ${NSD_CreateLabel} 20 20 280 40 "O GPTWhats é um bot inteligente para WhatsApp que utiliza GPT-5 Mini para conversas automáticas e naturais."
  Pop $0
  
  ${NSD_CreateLabel} 20 70 280 60 "Este instalador irá instalar o GPTWhats em seu computador, incluindo todas as dependências necessárias para o funcionamento completo do sistema."
  Pop $0
  
  ${NSD_CreateLabel} 20 140 280 40 "Após a instalação, você poderá configurar sua chave API da OpenAI e começar a usar imediatamente."
  Pop $0
  
  nsDialogs::Show
FunctionEnd

; Requirements page
Function showRequirementsPage
  !insertmacro MUI_HEADER_TEXT "Requisitos do Sistema" "Verificação de compatibilidade"
  
  nsDialogs::Create 1018
  Pop $0
  
  ${NSD_CreateLabel} 20 20 280 20 "Requisitos mínimos:"
  Pop $0
  
  ${NSD_CreateLabel} 30 50 250 20 "• Windows 10 ou superior (64-bit)"
  Pop $0
  
  ${NSD_CreateLabel} 30 70 250 20 "• 4 GB de RAM"
  Pop $0
  
  ${NSD_CreateLabel} 30 90 250 20 "• 500 MB de espaço em disco"
  Pop $0
  
  ${NSD_CreateLabel} 30 110 250 20 "• Conexão com internet"
  Pop $0
  
  ${NSD_CreateLabel} 20 140 280 20 "Recursos inclusos:"
  Pop $0
  
  ${NSD_CreateLabel} 30 170 250 20 "• Interface web completa"
  Pop $0
  
  ${NSD_CreateLabel} 30 190 250 20 "• Sistema de atualizações automáticas"
  Pop $0
  
  ${NSD_CreateLabel} 30 210 250 20 "• Banco de dados SQLite integrado"
  Pop $0
  
  ${NSD_CreateLabel} 30 230 250 20 "• Suporte a áudio, imagens e documentos"
  Pop $0
  
  nsDialogs::Show
FunctionEnd

; Post-install actions
Section -Post
  ; Create start menu entries
  CreateDirectory "$SMPROGRAMS\GPTWhats"
  CreateShortcut "$SMPROGRAMS\GPTWhats\GPTWhats.lnk" "$INSTDIR\GPTWhats.exe"
  CreateShortcut "$SMPROGRAMS\GPTWhats\Desinstalar GPTWhats.lnk" "$INSTDIR\Uninstall GPTWhats.exe"
  
  ; Create desktop shortcut if requested
  CreateShortcut "$DESKTOP\GPTWhats.lnk" "$INSTDIR\GPTWhats.exe"
  
  ; Register for auto-startup (optional)
  ; WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "GPTWhats" "$INSTDIR\GPTWhats.exe"
  
  ; Write uninstall information
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GPTWhats" "DisplayName" "GPTWhats - WhatsApp AI Bot"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GPTWhats" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GPTWhats" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GPTWhats" "UninstallString" "$INSTDIR\Uninstall GPTWhats.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GPTWhats" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GPTWhats" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\GPTWhats" "NoRepair" 1
  
  ; Set file associations
  WriteRegStr HKCR ".gptwhats" "" "GPTWhats.Config"
  WriteRegStr HKCR "GPTWhats.Config" "" "Arquivo de Configuração GPTWhats"
  WriteRegStr HKCR "GPTWhats.Config\shell\open\command" "" "$INSTDIR\GPTWhats.exe %1"
SectionEnd

; Post-install message
Function .onInstSuccess
  MessageBox MB_OK "GPTWhats foi instalado com sucesso!$\n$\nVocê pode iniciar o programa através do atalho na área de trabalho ou menu iniciar.$\n$\nLembre-se de configurar sua chave API da OpenAI na primeira execução."
FunctionEnd