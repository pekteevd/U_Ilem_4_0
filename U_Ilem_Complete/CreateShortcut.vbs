Option Explicit
Dim fso, shell, folder, shortcut, target, args
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
Set shortcut = shell.CreateShortcut(fso.BuildPath(folder, "У Илем.lnk"))
target = shell.ExpandEnvironmentStrings("%ComSpec%")
args = "/c """ & fso.BuildPath(folder, "Start_U_Ilem.bat") & """"
shortcut.TargetPath = target
shortcut.Arguments = args
shortcut.WorkingDirectory = folder
shortcut.IconLocation = fso.BuildPath(folder, "U_Ilem.ico") & ",0"
shortcut.Description = "У Илем — живая усадьба"
shortcut.WindowStyle = 7
shortcut.Save
