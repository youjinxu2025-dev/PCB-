Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
indexPath = fso.BuildPath(root, "index.html")

browser = ""

If fso.FileExists("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") Then
  browser = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ElseIf fso.FileExists("C:\Program Files\Microsoft\Edge\Application\msedge.exe") Then
  browser = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
ElseIf fso.FileExists("C:\Program Files\Google\Chrome\Application\chrome.exe") Then
  browser = "C:\Program Files\Google\Chrome\Application\chrome.exe"
ElseIf fso.FileExists("C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") Then
  browser = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
End If

If browser <> "" Then
  shell.Run """" & browser & """ """ & indexPath & """", 1, False
Else
  shell.Run """" & indexPath & """", 1, False
End If
