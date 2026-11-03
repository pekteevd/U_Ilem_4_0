Option Explicit
Dim fso, shell, folder, shortcut, target, args, iconPath
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
Set shortcut = shell.CreateShortcut(fso.BuildPath(folder, "У Илем 4.0.lnk"))
target = shell.ExpandEnvironmentStrings("%ComSpec%")
args = "/c """ & fso.BuildPath(folder, "Start_U_Ilem_4_0.bat") & """"
iconPath = fso.BuildPath(folder, "U_Ilem_4_0.ico")
shortcut.TargetPath = target
shortcut.Arguments = args
shortcut.WorkingDirectory = folder
shortcut.IconLocation = iconPath & ",0"
shortcut.Description = "У Илем 4.0 — живая усадьба"
shortcut.WindowStyle = 7
shortcut.Save
