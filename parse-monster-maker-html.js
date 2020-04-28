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
    return $m.find(`.${listingClass} span`).eq(2).text().trim();
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

}

function getAttacks(actionString) {
    let attacks = [];
    let words = actionString.split(' ');
    for (let i=0; i < words.length; i++) {
        let w = words[i];
        if (w=='vs' || w=="vs.") {
            let a = {
                original: `${words[i-1]} ${words[i]} ${words[i+1]}`,
                replace_by: convertAttack(words[i-1], words[i+1])
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
        converted = `@{hit ${value}} to hit, `
    } else {
        converted = `Make a @{dc ${value}} ${attackType} saving throw,`
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
                console.log(buffer)
                startChange = i + 1;
                let damage = parseInt(buffer.reduce(function(current, fused){
                    return fused+=current;
                }));

                let damageType = getDamageType(actionString.substring(startChange, endChange));

                results.push({
                    start: startChange,
                    end: endChange,
                    changeTo: `${convertDamage(damage)} ${damageType} damage` 
                })
                break;

            }
            i--;
        }
        lastFoundIndex = actionString.substring(lastFoundIndex+"damage".length, actionString.length-1).indexOf('damage');
        console.log("next last found index="+lastFoundIndex);
   }
   return results;

}

function getDamageType(damageString) {
    let chunks = damageString.split(' ');
    return chunks[ chunks.length- 2];
}

function convertDamage(damage) {
   return `{@h}${damage} ({%damage ${getDamageDice(damage)}d6})`;
}

function getDamageDice(damage) {
    return Math.ceil(damage*2/6);
}

function parseHTMLStatBlock(html) {
    let $m= $(html);

    let monster = {
        name: getName($m),
        source: "Gifflyglyph's Monster Maker",
        page: 0,
    }

    let descriptors = getDescription($m.find('.monster-description').trim());

    monster.size = descriptors.size;
    monster.type = descriptor.type;
    monster.alignment = descriptor.alignment;

    monster.ac = [
        {
            ac: $m.find('.monster-ac span').eq(1).text().trim(),
            from: [
            "natural armor"
            ]
        }
    ]

    // MONSTER HP
    let hp = parseInt($m.find('.monster-hp span').eq(1).text.trim());
    monster.hp = {
        'average': hp, //"Hit Points X"
        'formula': Math.ceil(hp/6)
    }

    // MONSTER SPEED
    monster.speed = parseSpeed($m.find('.monster-speed span').eq(1).text.trim());

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
    monster.saves = parseSaves($m.find('.monster-saves span').eq(1).text().trim());

    // SKILLS
    monster.skills = parseSaves($m.find('.monster-skills span').eq(1).text().trim());

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

    monster.cr = getListings($m, 'monster-challenge').text().trim();

    monster.vulnerable = getListings($m, 'monster-vulnerabilities').text().trim();

    monster.traits = $m.find('.monster-trait').map(function(t){
       let spans = $(t).find('span');
       return {
           'name': spans[0].innerText,
           'entries': [
               spans[1].innerText
           ]
       }
    })

    monster.actions = $m.find('monster-action').map(function(t){
       let spans = $(t).find('span');
       return {
           'name': spans[0].innerText,
           'entries': [
               spans[1].innerText
           ]
       }
    })

}