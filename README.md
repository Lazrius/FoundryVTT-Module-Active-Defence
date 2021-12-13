# Lazrius' Active Defence - FoundryVTT Module

## What is Active Defence?
Active defence is a rule variance for handling results of monster attack rolls. It is (to my knowledge) originally a homebrew rule from 'Darker Dungeons', and is meant to make defending have the same amount of dynamism and engagement as the other standard rolls.

### Ruling: 
When a monster attacks you, roll a d20 and add your AC as a dice check against the monsters attack. The monster DC is 22+ it’s attack bonus. On a natural 1 you are critically hit, on a natural 20 you parry the monster and may use your reaction to make an opportunity attack. If a monster has advantage against you, then you make your defensive roll with disadvantage. If a monster has disadvantage against you, then you make your defensive roll with advantage.


## Dependencies
This module is designed to work with the DnD5E system. It is unlikely to work with any other system.

## Installation:
Within the FoundryVTT Setup screen, navigate to "Add-on Modules" then click on "Install Module". Within the "Manifest Url" field, write: `https://raw.githubusercontent.com/Lazrius/FoundryVTT-Module-Active-Defence/master/Source/module.json`, then click install.

## Usage:
To make an active defence roll, simply navigate to the desired actor's character sheet, and then click on the armour class attribute. This will open a dialog box which looks like the standard roll interface, with the added button "Generate Macro". Pressing this will create a macro that can skip this process, so you can simply click on a token and then run the macro instead.