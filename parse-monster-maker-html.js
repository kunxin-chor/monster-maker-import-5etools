// constants

const sizeTable = {
    'Small':'S',
    'Huge':'H',
    'Medium':'M',
}

const alignmentTable = {
    'lawful':'L',
    'chaotic':'C',
    'good':'G',
    'evil':'E',
    'neutral':'N'
}

const possibleDamageTypes = [
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'
]

// end constants

function convertSize(sizeString) {
    return sizeTable[sizeString];
}

function getAlignmentShortForm(alignment) {
    return alignmentTable[alignment];
}


// end helpers
function getName($monster){
    return $monster.find('.monster-header h4').text().trim();
}


function getDescription(descriptor) {
    let chunks = descriptor.split(' ');
    return {
        size: convertSize(chunks[0]),
        type: {
            type:chunks[1],
            tags: [
                chunks[2].substring(1, chunks[2].length-2), // to remove the brackets and brackets,
            ]
        },
        alignment: [
             getAlignmentShortForm(chunks[3]),
             getAlignmentShortForm(chunks[4])
        ]
    }
}

function parseSpeed(speedLine) {
    let speeds = {}
    let speedChunks = speedLine.split(',');
    console.log(speedChunks);
    for (let speedString of speedChunks) {
         let speedType = speedString.trim().split(' ')[0].trim();
         let speedUnit = speedString.trim().split(' ')[1].trim(); // eg. speed 40ft

         if (speedType=='Speed') {
             speedType='walk'
         }
         speeds[speedType] = speedUnit;
    }
    return speeds;
}

function parseSaves(line) {
    // split throws by commna
    let throwChunks = line.trim().split(', ');

    let saves = {};
    for (let c of throwChunks) {
        let stats = c.trim().split(' ')[0];
        let modifier = c.trim().split(' ')[1];
        for(let s of stats.split('/')) {
            saves[s.toLowerCase()] = modifier;
        }
    }
    return saves;
}

function parseSkills(skillLine) {
    let chunks = skillLine.trim().split(',');
    let skills = {};
    for (let c of chunks) {
        c = c.trim();
        split = c.split('+');
        skills[split[0].trim().toLowerCase()] = parseInt(split[1].trim())  
    }
    return skills;
}

function parseSenses(sensesLine) {
    let senses = {}
    let chunks = sensesLine.split(',');

    for (let c of chunks) {
        let senseChunks = c.trim().split(' ');
     
        let type, unit;

        // fix for passive perception
        if (senseChunks[0] != 'passive') {
             type = senseChunks[0].trim();
             unit = senseChunks[1].trim(); 
        } else  {
             type = 'Passive perception';
             unit = senseChunks[2].trim();
        }
    
        senses[type] = parseInt(unit);
    }
    return senses;
}

function getListings($m, listingClass) {
    return $m.find(`.${listingClass} span`).eq(1).text().trim();
}

function parseAllActions(actionString) {
    let actions = $('.monster-action > p').map(function(action){
        $a = $(action);
        return {
            name: $a.find('span').eq(0).text(),
            entry: parseAction( $a.find('span').eq(1).text())
        }
    })
}

function parseAction(actionString) {
    let attacks = getAttacks(actionString);
    let damages = getDamageComponents(actionString);
    // replace
    for (let a of attacks) {
        actionString = actionString.replace(a.original, a.converted);
        if (a.type=='attack') {
            actionString = actionString.replace('Hit:', '');
        }
    }

    for (let d of damages) {
        actionString = actionString.replace(d.original, d.converted);
    }

    // replace melee weapon attack and ranged weapon attack
    actionString = actionString.replace('Melee Weapon Attack:', '{@atk mw}');
    actionString = actionString.replace('Ranged Weapon Attack:', '{@rtk mw');
    
    

    return actionString;

}

function getAttacks(actionString) {
    let attacks = [];
    let words = actionString.split(' ');
    for (let i=0; i < words.length; i++) {
        let w = words[i];
        if (w=='vs' || w=="vs.") {
            let a = {
                original: `${words[i-1]} ${words[i]} ${words[i+1]}`,
                converted: convertAttack(words[i-1], words[i+1])
            }
            if (words[i+1].replace('.','').toLowerCase() != "ac") {
                a.original = "DC " + a.original;
                a.type="save";
            } else{
                a.type="attack";
            }

            attacks.push(a);
        }
        
    }
 
    return attacks;
}

function convertAttack(value, attackType) {

    // remove puntuctation
    let attackTypeToMatch = attackType.replace('.', '').replace(',', '').trim();

    let converted="";
    if (attackTypeToMatch.toLowerCase()=="ac") {
        converted = `{@hit ${value.replace('+','')}} to hit, `
    } else {
        converted = `The target must succeed on a {@dc ${value}} ${attackTypeToMatch} saving throw.`
    }
    return converted;

    


}


function getDamageComponents(actionString) {
    // pattern to match:
    // X damage
    // X <damage type> damage
    // X (<dice notation>) damage
    // X (<dice notation>) <damage type> damage
 

   // find all occurrences of damage
   let results = [];
   let lastFoundIndex = actionString.indexOf('damage');
   let breaker2 = 0;
   while (lastFoundIndex != -1 && lastFoundIndex < actionString.length && breaker2 < 1000) {
       breaker2++;
        if (breaker2==100) {
            break;
        }
        // trace backward till we find a number not enclosed within a parethensis
        let haveParenthesis = false;
        let foundMatchingParenthesis = false;
        let i = lastFoundIndex;
        let buffer = [];
        let startChange = 0;
        let endChange = lastFoundIndex;
        let breaker=0;

        while (i>0) {
            breaker++;
            if (breaker > 100) {
                break;
            }
            if (actionString[i]==')') {
                haveParenthesis = true;
            } else if (actionString[i]=='(') {
                foundMatchingParenthesis = true;
            } else if (actionString[i] != " " && !isNaN(actionString[i]) && (haveParenthesis==false || (haveParenthesis && foundMatchingParenthesis))) {
                buffer.push(actionString[i])
            } else if (actionString[i]==' ' && buffer.length > 0) {
                startChange = i + 1;
                let damage = parseInt(buffer.reduce(function(current, fused){
                    return fused+=current;
                }));

                let damageType = getDamageType(actionString.substring(startChange, endChange));
                
                // if damage type is not found
                if (possibleDamageTypes.indexOf(damageType.trim().toLowerCase()) == -1) {
                    damageType="";

                }

                results.push({
                    // start: startChange,
                    // end: endChange,
                    original: actionString.substring(startChange, endChange),
                    converted: damageType !="" ? `${convertDamage(damage)} ${damageType} ` :
                                                 `${convertDamage(damage)} `
                })
                break;

            }
            i--;
        }
        actionString =  actionString.substring(lastFoundIndex+"damage".length, actionString.length-1)
        lastFoundIndex = actionString.indexOf('damage');
        console.log("next last found index="+lastFoundIndex);
   }
   return results;

}

function getDamageType(damageString) {
    let chunks = damageString.split(' ');
    return chunks[ chunks.length- 2];
}

function convertDamage(damage) {
   return `{@h}${damage} ({@damage ${getDamageDice(damage)}d6})`;
}

function getDamageDice(damage) {
    return Math.ceil(damage/3.5);
}

function parseHTMLStatBlock(html) {
    let $m= $(html);

    let monster = {
        name: getName($m),
        source: "Giffyglpyh",
        page: 0,
    }

    let descriptors = getDescription($m.find('.monster-description').text().trim());

    monster.size = descriptors.size;
    monster.type = descriptors.type;
    monster.alignment = descriptors.alignment;

    monster.ac = [
        {
            ac: $m.find('.monster-ac span').eq(1).text().trim(),
            from: [
            "natural armor"
            ]
        }
    ]

    // MONSTER HP
    let hp = parseInt($m.find('.monster-hp span').eq(1).text().trim());
    monster.hp = {
        'average': hp, //"Hit Points X"
        'formula': Math.ceil(hp/3.5) + "d6"
    }

    // MONSTER SPEED
    monster.speed = parseSpeed($m.find('.monster-speed span').eq(1).text().trim());

    // MONSTER SCORES
    let abilities = $m.find('.monster-ability');
    let scores = [];
    for (let a of abilities) {
        scores.push(parseInt($(a).find('span').eq(1).text().trim()))
    }
    
    monster.str = scores[0];
    monster.dex = scores[1];
    monster.con = scores[2];
    monster.int = scores[3];
    monster.wis = scores[4];
    monster.cha = scores[5];

    // SAVES
    monster.save = parseSaves($m.find('.monster-saves span').eq(1).text().trim());

    // SKILLS
    monster.skill = parseSaves($m.find('.monster-skills span').eq(1).text().trim());

    // SENSES
    let senses = parseSenses($m.find('.monster-senses span').eq(1).text().trim());
    monster.senses = [];
    for (let s in senses) {
        if (s != 'Passive perception') {
            monster.senses.push(s + " " + senses[s] + " ft.")
        }
    }
    monster.passive = senses['Passive perception'];

    // IMMUNITIES
    let immunities = getListings($m, 'monster-immunities');
    monster.immunities = immunities.split(', ').map(function(s){
        return s.trim();
    });

    // CONDIITONS IMMUNITIES
    monster.conditionImmune = getListings($m, 'monster-conditions').split(', ').map(function(s){
        return s.trim();
    });

    // LANGUAGES
    monster.languages = getListings($m, 'monster-languages').split(', ').map(function(s){
        return s.trim();
    })

    monster.cr = getListings($m, 'monster-challenge');

    monster.vulnerable = getListings($m, 'monster-vulnerabilities').split(', ').map(function(s){
        return s.trim();
    });
    
    monster.resistance = getListings($m, 'monster-resistances').split(', ').map(function(s){
        return s.trim();
    });

    monster.trait = $m.find('.monster-trait').toArray().map(function(t){

       let spans = $(t).find('span');
       return {
           'name': spans[0].innerText,
           'entries': [
               spans[1].innerText
           ]
       }
    })

    monster.action = $m.find('.monster-action').toArray().map(function(t){
       let spans = $(t).find('span');
       console.log(spans);
       return {
           'name': spans[0].innerText,
           'entries': [
               parseAction(spans[1].innerText)
           ]
       }
    })

    console.log(monster)
    return JSON.stringify(monster);

}