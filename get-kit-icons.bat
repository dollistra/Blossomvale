@echo off
rem Get the real Minecraft item pictures for the shop's kit chests.
rem Double-click this file. It copies pictures out of YOUR OWN Minecraft install next to it, named kit-<name>.png.
rem Nothing is downloaded. Can't find the game? Drag your Minecraft .jar file (like 1.21.x.jar) onto this file.
rem Mojang's pictures belong to Mojang/Microsoft: check https://www.minecraft.net/en-us/usage-guidelines before using them on a page that sells things.
set "JARARG=%~1"
set "HERE=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText('%~f0'); $i=$t.LastIndexOf('#'+'PS#'); Invoke-Expression $t.Substring($i+4)"
echo.
pause
exit /b
#PS#
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $here = $env:HERE.TrimEnd('\')
  $jar = $env:JARARG
  $items = 'redstone repeater comparator hopper iron_ingot gold_ingot diamond emerald coal experience_bottle lapis_lazuli stone_pickaxe stone_axe iron_sword iron_pickaxe iron_axe iron_shovel diamond_sword diamond_pickaxe diamond_axe diamond_shovel iron_helmet iron_chestplate iron_leggings iron_boots bow arrow cooked_beef golden_carrot bone_meal lantern honey_bottle cake'.Split(' ')
  $blocks = 'torch cherry_sapling oak_sapling lever redstone_torch powered_rail detector_rail piston_top piston_side piston_top_sticky observer_top observer_front observer_side furnace_top furnace_side dropper_front dispenser_front slime_block honey_block_top honey_block_side note_block target_top target_side redstone_lamp daylight_detector_top daylight_detector_side'.Split(' ')
  $shulkers = 'shulker_lime shulker_purple shulker_pink shulker_yellow'.Split(' ')
  function HasPictures($path) {
    try { $z = [IO.Compression.ZipFile]::OpenRead($path); $e = $z.GetEntry('assets/minecraft/textures/item/iron_pickaxe.png'); $z.Dispose(); return ($e -ne $null) } catch { return $false }
  }
  if (-not $jar) {
    $roots = @("$env:APPDATA\.minecraft\versions", "$env:APPDATA\.tlauncher\versions", "$env:APPDATA\PrismLauncher\libraries\com\mojang", "$env:APPDATA\ModrinthApp\meta\versions", "$env:USERPROFILE\.lunarclient\offline") | Where-Object { Test-Path $_ }
    $found = foreach ($r in $roots) { Get-ChildItem -LiteralPath $r -Recurse -Filter *.jar -ErrorAction SilentlyContinue }
    foreach ($j in ($found | Sort-Object LastWriteTime -Descending)) { if (HasPictures $j.FullName) { $jar = $j.FullName; break } }
  }
  if (-not $jar -or -not (Test-Path -LiteralPath $jar)) {
    Write-Host ''
    Write-Host "Couldn't find your Minecraft game file." -ForegroundColor Yellow
    Write-Host 'Find a Minecraft .jar (for example in %appdata%\.minecraft\versions\1.21.x\1.21.x.jar)'
    Write-Host 'and drag it onto this get-kit-icons.bat file.'
    return
  }
  $out = $here
  $z = [IO.Compression.ZipFile]::OpenRead($jar)
  $got = 0; $missing = @()
  foreach ($n in ($items + $blocks)) {
    $dir = if ($blocks -contains $n) { 'block' } else { 'item' }
    $e = $z.GetEntry("assets/minecraft/textures/$dir/$n.png")
    if ($e) { [IO.Compression.ZipFileExtensions]::ExtractToFile($e, (Join-Path $out "kit-$n.png"), $true); $got++ } else { $missing += $n }
  }
  foreach ($n in $shulkers) {
    $e = $z.GetEntry("assets/minecraft/textures/entity/shulker/$n.png")
    if ($e) { [IO.Compression.ZipFileExtensions]::ExtractToFile($e, (Join-Path $out "kit-$n.png"), $true); $got++ } else { $missing += $n }
  }
  $z.Dispose()
  Write-Host ''
  Write-Host "Done. Copied $got pictures from:" -ForegroundColor Green
  Write-Host "  $jar"
  Write-Host "into:"
  Write-Host "  $out"
  if ($missing.Count -gt 0) { Write-Host ('Not found (these keep the drawn icon): ' + ($missing -join ', ')) }
  Write-Host ''
  Write-Host 'Now refresh the shop page (Ctrl+F5).'
} catch {
  Write-Host ''
  Write-Host ('Something went wrong: ' + $_.Exception.Message) -ForegroundColor Red
}
