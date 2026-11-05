# Copies the real Minecraft item pictures out of YOUR OWN Minecraft install into a "kit-icons" folder
# next to kit.js, so the shop's monthly-kit chests show real icons. Nothing is downloaded.
# Mojang's pictures belong to Mojang/Microsoft: check https://www.minecraft.net/en-us/usage-guidelines
# before using them on a page that sells things. Don't run this if you'd rather keep the drawn icons.
param([string]$Jar = "")
Add-Type -AssemblyName System.IO.Compression.FileSystem
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Jar) {
  $roots = @("$env:APPDATA\.minecraft\versions", "$env:USERPROFILE\.lunarclient\offline", "$env:APPDATA\.tlauncher\versions", "$env:APPDATA\PrismLauncher\libraries", "$env:APPDATA\ModrinthApp\meta\versions")
  $cands = foreach ($r in $roots) { if (Test-Path $r) { Get-ChildItem $r -Recurse -Filter *.jar -ErrorAction SilentlyContinue } }
  # the client jar is the one that actually contains the item pictures
  foreach ($c in ($cands | Sort-Object LastWriteTime -Descending)) {
    try { $z = [IO.Compression.ZipFile]::OpenRead($c.FullName); $ok = $z.GetEntry("assets/minecraft/textures/item/iron_pickaxe.png"); $z.Dispose(); if ($ok) { $Jar = $c.FullName; break } } catch {}
  }
}
if (-not $Jar -or -not (Test-Path $Jar)) { Write-Host "Couldn't find your Minecraft client .jar."; Write-Host "Run:  powershell -File get-kit-icons.ps1 -Jar 'C:\path\to\1.21.x.jar'"; exit 1 }
$items = "redstone repeater comparator hopper iron_ingot gold_ingot diamond emerald coal experience_bottle redstone lapis_lazuli stone_pickaxe stone_axe iron_sword iron_pickaxe iron_axe iron_shovel diamond_sword diamond_pickaxe diamond_axe diamond_shovel iron_helmet iron_chestplate iron_leggings iron_boots bow arrow cooked_beef golden_carrot bone_meal lantern honey_bottle cake".Split(" ")
$blocks = "torch cherry_sapling oak_sapling lever redstone_torch powered_rail detector_rail piston_top piston_side piston_top_sticky observer_top observer_front observer_side furnace_top furnace_side dropper_front dispenser_front slime_block honey_block_top honey_block_side note_block target_top target_side redstone_lamp daylight_detector_top daylight_detector_side".Split(" ")
$out = Join-Path $here "kit-icons"; New-Item -ItemType Directory -Force $out | Out-Null
$z = [IO.Compression.ZipFile]::OpenRead($Jar); $got = 0; $missing = @()
foreach ($n in $items + $blocks) {
  $dir = if ($blocks -contains $n) { "block" } else { "item" }
  $e = $z.GetEntry("assets/minecraft/textures/$dir/$n.png")
  if ($e) { [IO.Compression.ZipFileExtensions]::ExtractToFile($e, (Join-Path $out "$n.png"), $true); $got++ } else { $missing += $n }
}
$z.Dispose()
Write-Host "Copied $got pictures from $Jar into $out"
if ($missing) { Write-Host "Not found (keep their drawn icon): $($missing -join ', ')" }
