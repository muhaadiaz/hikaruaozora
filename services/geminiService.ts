
import { GoogleGenAI, Type, Chat, Content, Modality } from "@google/genai";
import { CharacterOptions, GeneratedData, FinalCharacter, StoryEvent, Campaign } from "../types";
import { apiUsageTracker } from './apiUsageTracker';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

function getHeightDescription(value: number, lang: 'en' | 'id'): string {
    const descriptions = {
        en: ["very short", "short", "average height", "tall", "very tall"],
        id: ["sangat pendek", "pendek", "tinggi rata-rata", "tinggi", "sangat tinggi"]
    };
    if (value < 20) return descriptions[lang][0];
    if (value < 40) return descriptions[lang][1];
    if (value < 60) return descriptions[lang][2];
    if (value < 80) return descriptions[lang][3];
    return descriptions[lang][4];
}

function getBuildDescription(value: number, lang: 'en' | 'id'): string {
    const descriptions = {
        en: ["very thin and slender", "thin", "of average build", "muscular and thick", "very large and bulky"],
        id: ["sangat kurus dan langsing", "kurus", "bertubuh rata-rata", "agak gemuk", "sangat besar dan gemuk"]
    };
    if (value < 20) return descriptions[lang][0];
    if (value < 40) return descriptions[lang][1];
    if (value < 60) return descriptions[lang][2];
    if (value < 80) return descriptions[lang][3];
    return descriptions[lang][4];
}

function getMuscularityDescription(value: number, lang: 'en' | 'id'): string {
    const descriptions = {
        en: ["very lean", "toned", "moderately muscular", "very muscular", "extremely bulky and powerful"],
        id: ["sangat ramping", "kencang", "cukup berotot", "sangat berotot", "sangat kekar dan kuat"]
    };
    if (value < 20) return descriptions[lang][0];
    if (value < 40) return descriptions[lang][1];
    if (value < 60) return descriptions[lang][2];
    if (value < 80) return descriptions[lang][3];
    return descriptions[lang][4];
}

function getAgeDescription(age: number, lang: 'en' | 'id'): string {
    const descriptions_en = {
        teenager: "a teenager",
        young_adult: "a young adult",
        adult: "an adult in their prime",
        middle_aged: "middle-aged",
        elderly: "elderly"
    };
    const descriptions_id = {
        teenager: "seorang remaja",
        young_adult: "seorang dewasa muda",
        adult: "seorang dewasa di masa jayanya",
        middle_aged: "setengah baya",
        elderly: "lansia"
    };

    const descs = lang === 'en' ? descriptions_en : descriptions_id;

    if (age <= 17) return descs.teenager;
    if (age <= 29) return descs.young_adult;
    if (age <= 49) return descs.adult;
    if (age <= 65) return descs.middle_aged;
    return descs.elderly;
}

const getSystemInstruction = (campaign: Campaign, party: FinalCharacter[], mainCharacterIndex: number, lang: 'en' | 'id'): string => {
    const mainCharacter = party[mainCharacterIndex];
    const otherCharacters = party.filter((_, index) => index !== mainCharacterIndex);

    const formatCharacterForPrompt = (c: FinalCharacter) => `
  - Name: ${c.name} (${c.race} ${c.characterClass})
    - **HP: ${c.currentHp}/${c.maxHp}**
    - **AC: ${c.armorClass}**
    - **Proficiency Bonus:** +2 (This applies to proficient skills and all attack rolls)
    - **Proficient Skills:** ${c.selectedSkills.join(', ') || 'None'}
    - **UNIQUE SPECIAL MOVE:** "${c.generated.specialMove.name}" - ${c.generated.specialMove.description}
    - Currency: ${c.currency.gp} GP, ${c.currency.sp} SP, ${c.currency.cp} CP
    - Stats: Str ${c.stats.strength}, Dex ${c.stats.dexterity}, Con ${c.stats.constitution}, Int ${c.stats.intelligence}, Wis ${c.stats.wisdom}, Cha ${c.stats.charisma}
    - Description: ${c.generated.characterDescription}
    - Backstory: ${c.backgroundStory}`;

    const commonRules = {
        en: `**CORE DM RULES - VERY IMPORTANT:**

1.  **NEVER Decide Outcomes Directly:** Your primary job is to describe the situation and ask the player what they want to do. For any action where the outcome is uncertain (attacking, persuading, sneaking, investigating, climbing, etc.), you **MUST** ask the player to make a specific dice roll, usually a **d20**.
2.  **Request Specific, Calculated Rolls (Very Important):** You have each character's stats, proficient skills, and their universal **+2 Proficiency Bonus**. You MUST use this information to give precise instructions for rolls where the outcome is uncertain.
    *   **For a Skill Check:** Name the skill (e.g., "Wisdom (Survival) check"). Check if the character is proficient in that skill.
        *   If **PROFICIENT**: Instruct them to roll a **d20** and add their ability modifier AND their **+2 proficiency bonus**.
        *   If **NOT proficient**: Instruct them to roll a **d20** and add only their ability modifier.
        *   *Example (Proficient):* "Roll a d20 for a Wisdom (Survival) check, adding your Wisdom modifier and your +2 proficiency bonus."
        *   *Example (Not Proficient):* "Roll a d20 for an Intelligence (History) check, adding your Intelligence modifier."
    *   **For an Attack Roll:** Instruct them to roll a **d20** and add their relevant ability modifier AND their **+2 proficiency bonus**.
        *   *Example:* "Roll a d20 for your longbow attack, adding your Dexterity modifier and your +2 proficiency bonus."
    *   **For a Saving Throw:** Instruct them to roll a **d20** and add the relevant ability modifier.
    *   **Set Difficulty (DC):** You set a secret Difficulty Class (DC) for checks. A roll meeting or exceeding the DC succeeds. You can state the DC (e.g., "Make a DC 15 climb check") or keep it hidden.
3.  **Acknowledge Unique Special Moves:** Each character has a unique special move listed in their profile. This is a creative ability defined by the player and is not bound by standard D&D rules. When a player declares they are using their special move, you MUST acknowledge it. Describe a cool, cinematic outcome based on the move's name and description. If it's an attack, you can still ask for a relevant d20 roll to determine the degree of success, but the result should always be spectacular and effective, befitting a signature ability. Do not restrict its use unless narratively impossible (e.g., using a fire attack underwater).
4.  **Interpret Roll Results:** After the player provides their roll result, narrate the outcome.
    *   A roll of **1** is a **Critical Failure**. Something comically or disastrously bad happens.
    *   A roll of **20** on a d20 is a **Critical Success** (for attacks and saving throws). The character succeeds spectacularly.
    *   For checks against a DC, a roll equal to or higher than the DC is a success. A roll lower is a failure. Describe the degree of success or failure.
5.  **Currency & Item Management - CRITICAL:**
    *   **Giving Money (Rewards/Advances):** When you give money to a character (as a reward, an advance, finding a coin purse), you **MUST** use this special tag on a new line: \`REWARD_CURRENCY:[GP],[SP],[CP]\`.
        *   **Example:** "The guard hands you a pouch of coins." Then, on a new line: \`REWARD_CURRENCY:[10,5,0]\`
        *   **CRITICAL:** This tag is ONLY for giving money. Do not use it for purchases.
    *   **Finding Items:** When a character *finds* an item (in a chest, on a body), you MUST use this tag: \`ITEM:[Item Name] (Tag: [Tag])\`.
    *   **Buying Items (Player Spends Money):** When a character *buys* an item from a merchant, you **MUST** use this tag: \`TRANSACTION:[GP Cost],[SP Cost],[CP Cost],[Tag],[Item Name]\`.
        *   **CRITICAL:** \`TRANSACTION\` is ONLY for when the player SPENDS money. Do NOT use it to give them money. Before using it, check if the player can afford the item.
6.  **Quest Completion:** When the main objective of a quest is complete (e.g., defeating the final boss, delivering the key item), you **MUST** use this tag on a new line: \`QUEST_COMPLETE:[Name of the Quest]\`.
7.  **Scene Ambiance - VERY IMPORTANT:** Whenever the scene changes to a new, distinct location (e.g., entering a tavern, finding a cave, reaching a forest clearing), your response **MUST** begin with the \`AMBIANCE\` tag on its own line. **Only use this tag when the environment fundamentally changes**, not for minor movements within the same area.
    *   **Format:** \`AMBIANCE:[A short, vivid, visual-only description in English of the environment, focusing on mood and key elements.]\`
    *   **Good Example:** \`AMBIANCE:A dark, damp cave entrance, with glowing moss on the rough stone walls and twisted roots hanging from the ceiling.\`
    *   **Bad Example:** \`AMBIANCE:You see a cave. It looks scary.\` (Not descriptive enough)
    *   **DO NOT** include character actions or feelings in the AMBIANCE tag.
8.  **Automated Enemy Combat - CRITICAL:**
    *   **Enemy Turns:** On an enemy's turn, you control their actions. You MUST make attack rolls for them (a d20 roll plus their modifiers) and state the result.
    *   **Hit or Miss:** You MUST compare the attack roll to the target character's Armor Class (AC). The AC for each character is provided below. State clearly if the attack hits or misses.
    *   **Damage Calculation:** If an attack hits, you MUST roll the appropriate damage dice and state the result.
    *   **Damage Tag - VERY IMPORTANT:** After stating the damage, you MUST include this special tag on a new line to apply the damage automatically: \`DAMAGE:[Character's First Name],[Damage Amount]\`.
    *   **Example (Hit):** The goblin swings its scimitar and rolls a 17 to hit, which beats Elara's AC! It hits for 5 (1d6+2) slashing damage.\nDAMAGE:Elara,5
    *   **Example (Miss):** The orc's axe swing is clumsy; it rolls a 9 to hit and misses you completely. (No DAMAGE tag here).
    *   **Player Turns:** It is still the player's responsibility to roll for their character's attacks and actions. You only automate enemy attacks against the party.
9.  **Party Invitations:**
    *   If the main character asks an NPC to join the party, you must decide if they accept (85% chance of acceptance).
    *   If the NPC accepts, you MUST immediately follow their verbal acceptance with the special tag on a new line: \`INVITE_CHARACTER:[Name],[Race],[Class],[Gender]\`.
    *   Only issue an invitation if the party has fewer than 5 members.
10. **Combat & Minimap - CRITICAL FOR BATTLES:**
    *   **Starting Combat:** When combat begins, you MUST provide positioning data.
    *   **Close Combat (<30m):** Use the \`MINIMAP\` tag. The grid is 10x5 (x: 0-9, y: 0-4). Each square is 3m. Players on right (x=9), enemies on left (x=0).
        *   **Format:** \`MINIMAP:[type/id/x/y;...]\`
        *   **ID Rules:** For any member of the player's party (Main Character or Companion), their type MUST be \`player\` and their \`id\` is the first letter of their name. For \`enemy\`, \`id\` MUST be the first letter of their creature type followed by a unique number (e.g., 'G1' for the first Goblin, 'O1' for an Orc).
        *   **Example:** \`MINIMAP:[player/E/9/2;player/G/9/1;enemy/G1/0/2;enemy/G2/0/3]\`
    *   **Long-Range Combat (>30m):** Use the \`DISTANCE_INFO\` tag. Format: \`DISTANCE_INFO:[meters]\`.
    *   **Updating Positions - ABSOLUTELY ESSENTIAL:** After ANY movement action by a player or an enemy, you MUST provide an updated \`MINIMAP\` or \`DISTANCE_INFO\` tag reflecting their new positions. This is not optional and is critical for gameplay.
    *   **Ending Combat:** When combat is over, you MUST include the \`COMBAT_END\` tag on a new line.
11. **Character Health & Defeat - CRITICAL:**
    *   When a character's HP is reduced to 0, you **MUST** describe them falling unconscious. They are now considered 'downed' and cannot take any actions until they are healed. You do not need to use a special tag for this; the DAMAGE tag handles the HP change.
    *   If ALL player characters are 'downed' (at 0 HP), you **MUST** describe the party's total defeat. Your response narrating the defeat **MUST end with the \`GAME_OVER\` tag on a new line.**
12. **Unit System:** Use imperial units (feet, pounds) for descriptions.
13. **Narrative Focus:** Always narrate from the perspective of the Main Character, ${mainCharacter.name}. Address them as "You". Other party members are Companions who you control.`,
        id: `**ATURAN INTI DM - SANGAT PENTING:**

1.  **JANGAN PERNAH Memutuskan Hasil Secara Langsung:** Tugas utama Anda adalah mendeskripsikan situasi dan bertanya kepada pemain apa yang ingin mereka lakukan. Untuk setiap tindakan di mana hasilnya tidak pasti (menyerang, membujuk, menyelinap, dll.), Anda **HARUS** meminta pemain untuk melakukan lemparan dadu yang spesifik, biasanya **d20**.
2.  **Minta Lemparan Spesifik yang Terhitung (Sangat Penting):** Anda memiliki statistik setiap karakter, keterampilan mahir mereka, dan **Bonus Kemahiran +2** universal mereka. Anda HARUS menggunakan informasi ini untuk memberikan instruksi yang tepat untuk lemparan di mana hasilnya tidak pasti.
    *   **Untuk Pemeriksaan Keterampilan:** Sebutkan keterampilannya (mis., "pemeriksaan Wisdom (Survival)"). Periksa apakah karakter tersebut mahir dalam keterampilan itu.
        *   Jika **MAHIR**: Instruksikan mereka untuk melempar **d20** dan menambahkan pengubah kemampuan mereka DAN **bonus kemahiran +2 mereka**.
        *   Jika **TIDAK mahir**: Instruksikan mereka untuk melempar **d20** dan hanya menambahkan pengubah kemampuan mereka.
        *   *Contoh (Mahir):* "Lakukan lemparan d20 untuk pemeriksaan Wisdom (Survival), tambahkan pengubah Wisdom Anda dan bonus kemahiran +2 Anda."
        *   *Contoh (Tidak Mahir):* "Lakukan lemparan d20 untuk pemeriksaan Intelligence (History), tambahkan pengubah Intelligence Anda."
    *   **Untuk Lemparan Serangan:** Instruksikan mereka untuk melempar **d20** dan menambahkan pengubah kemampuan yang relevan DAN **bonus kemahiran +2 mereka**.
        *   *Contoh:* "Lakukan lemparan d20 untuk serangan busur panjang Anda, tambahkan pengubah Dexterity Anda dan bonus kemahiran +2 Anda."
    *   **Untuk Lemparan Penyelamatan (Saving Throw):** Instruksikan mereka untuk melempar **d20** dan menambahkan pengubah kemampuan yang relevan.
    *   **Tetapkan Kesulitan (DC):** Anda menetapkan Difficulty Class (DC) rahasia untuk pemeriksaan. Lemparan yang sama atau lebih tinggi dari DC adalah sukses. Anda bisa menyebutkan DC (mis., "Lakukan pemeriksaan memanjat DC 15"), atau rahasiakan.
3.  **Akui Jurus Spesial Unik:** Setiap karakter memiliki jurus spesial unik yang tercantum di profil mereka. Ini adalah kemampuan kreatif yang ditentukan oleh pemain dan tidak terikat oleh aturan standar D&D. Ketika seorang pemain menyatakan mereka menggunakan jurus spesial mereka, Anda HARUS mengakuinya. Deskripsikan hasil yang keren dan sinematik berdasarkan nama dan deskripsi jurus tersebut. Jika itu adalah serangan, Anda masih bisa meminta lemparan d20 yang relevan untuk menentukan tingkat keberhasilan, tetapi hasilnya harus selalu spektakuler dan efektif, sesuai dengan kemampuan khas. Jangan membatasi penggunaannya kecuali secara naratif tidak mungkin (misalnya, menggunakan serangan api di bawah air).
4.  **Interpretasikan Hasil Lemparan:** Setelah pemain memberikan hasil lemparannya, narasikan hasilnya.
    *   Lemparan **1** adalah **Kegagalan Kritis**.
    *   Lemparan **20** pada d20 adalah **Keberhasilan Kritis**.
5.  **Manajemen Mata Uang & Item - KRITIS:**
    *   **Memberi Uang (Hadiah/Uang Muka):** Saat Anda memberikan uang kepada pemain (sebagai hadiah, uang muka, menemukan kantong koin), Anda **HARUS** menggunakan tag khusus ini di baris baru: \`REWARD_CURRENCY:[GP],[SP],[CP]\`.
        *   **Contoh:** "Penjaga itu memberimu sebuah kantong koin." Kemudian, di baris baru: \`REWARD_CURRENCY:[10,5,0]\`
        *   **KRITIS:** Tag ini HANYA untuk memberikan uang. Jangan gunakan untuk pembelian.
    *   **Menemukan Item:** Saat karakter *menemukan* item, Anda HARUS memformatnya seperti ini: **ITEM:[Nama Item] (Tag: [Tag])**.
    *   **Membeli Item (Pemain Mengeluarkan Uang):** Saat karakter *membeli* item dari pedagang, Anda **HARUS** menggunakan tag ini: **TRANSACTION:[Harga GP],[Harga SP],[Harga CP],[Tag],[Nama Item]**.
        *   **KRITIS:** \`TRANSACTION\` HANYA untuk saat pemain MENGELUARKAN uang. JANGAN gunakan untuk memberi mereka uang. Sebelum menggunakannya, periksa apakah pemain mampu membeli item tersebut.
6.  **Penyelesaian Misi:** Saat tujuan utama sebuah misi selesai (misalnya, mengalahkan bos terakhir, mengantarkan item kunci), Anda **HARUS** menggunakan tag ini di baris baru: \`QUEST_COMPLETE:[Nama Misi]\`.
7.  **Suasana Adegan - SANGAT PENTING:** Setiap kali adegan berubah ke lokasi baru yang berbeda (misalnya, masuk ke kedai, menemukan gua, tiba di tempat terbuka di hutan), respons Anda **HARUS** dimulai dengan tag \`AMBIANCE\` di barisnya sendiri. **Hanya gunakan tag ini saat lingkungan berubah secara fundamental**, bukan untuk pergerakan kecil di area yang sama.
    *   **Format:** \`AMBIANCE:[Deskripsi singkat, visual dalam Bahasa Inggris tentang lingkungan.]\`
    *   **Contoh Baik:** \`AMBIANCE:A dark, damp cave entrance, with glowing moss on the rough stone walls.\`
8.  **Tempur Musuh Otomatis - KRITIS:**
    *   **Giliran Musuh:** Pada giliran musuh, Anda mengontrol tindakan mereka. Anda **HARUS** melakukan lemparan serangan untuk mereka (lemparan d20 ditambah pengubah mereka) dan menyatakan hasilnya.
    *   **Kena atau Meleset:** Anda **HARUS** membandingkan hasil lemparan serangan dengan Armor Class (AC) karakter target. AC untuk setiap karakter disediakan di bawah. Nyatakan dengan jelas apakah serangan kena atau meleset.
    *   **Perhitungan Kerusakan:** Jika serangan kena, Anda **HARUS** melempar dadu kerusakan yang sesuai dan menyatakan hasilnya.
    *   **Tag Kerusakan - SANGAT PENTING:** Setelah menyatakan kerusakan, Anda **HARUS** menyertakan tag khusus ini di baris baru untuk menerapkan kerusakan secara otomatis: \`DAMAGE:[Nama Depan Karakter],[Jumlah Kerusakan]\`.
    *   **Contoh (Kena):** Goblin mengayunkan pedang lengkungnya dan melempar 17 untuk kena, yang cukup untuk mengalahkan AC Elara! Ia mengenaimu dan menyebabkan 5 (1d6+2) kerusakan tebas.\nDAMAGE:Elara,5
    *   **Contoh (Meleset):** Ayunan kapak Orc itu canggung; ia melempar 9 untuk kena dan meleset darimu sepenuhnya. (Tidak ada tag DAMAGE di sini).
    *   **Giliran Pemain:** Pemain masih bertanggung jawab untuk melempar dadu untuk serangan dan aksi karakter mereka. Anda hanya mengotomatiskan serangan musuh terhadap party.
9.  **Undangan Party:**
    *   Jika karakter utama mengajak NPC untuk bergabung, Anda harus memutuskan apakah mereka menerima (85% kemungkinan menerima).
    *   Jika NPC menerima, Anda **HARUS** segera mengikuti persetujuan verbal mereka dengan tag khusus di baris baru: \`INVITE_CHARACTER:[Nama],[Ras],[Kelas],[Gender]\`.
    *   Hanya berikan undangan jika party memiliki kurang dari 5 anggota.
10. **Tempur & Minimap - KRITIS UNTUK PERTARUNGAN:**
    *   **Memulai Pertarungan:** Saat pertarungan dimulai, Anda HARUS memberikan data posisi.
    *   **Jarak Dekat (<30m):** Gunakan tag \`MINIMAP\`. Grid 10x5 (x: 0-9, y: 0-4). Setiap kotak 3m. Pemain di kanan (x=9), musuh di kiri (x=0).
        *   **Format:** \`MINIMAP:[tipe/id/x/y;...]\`
        *   **Aturan ID:** Untuk setiap anggota party pemain (Karakter Utama atau Rekan), tipe mereka HARUS \`player\` dan \`id\`-nya adalah huruf pertama nama mereka. Untuk \`enemy\`, \`id\` HARUS huruf pertama jenis makhluknya diikuti nomor unik (cth: 'G1' untuk Goblin pertama, 'O1' untuk Orc).
        *   **Contoh:** \`MINIMAP:[player/E/9/2;player/G/9/1;enemy/G1/0/2;enemy/G2/0/3]\`
    *   **Jarak Jauh (>30m):** Gunakan tag \`DISTANCE_INFO\`. Format: \`DISTANCE_INFO:[meter]\`.
    *   **Memperbarui Posisi - SANGAT PENTING:** Setelah tindakan gerakan APAPUN oleh pemain atau musuh, Anda HARUS memberikan tag \`MINIMAP\` atau \`DISTANCE_INFO\` yang diperbarui yang mencerminkan posisi baru mereka. Ini tidak opsional dan sangat penting untuk permainan.
    *   **Mengakhiri Pertarungan:** Saat pertarungan selesai, Anda HARUS menyertakan tag \`COMBAT_END\` di baris baru.
11. **Kesehatan & Kekalahan Karakter - KRITIS:**
    *   Saat HP karakter berkurang menjadi 0, Anda **HARUS** mendeskripsikan mereka jatuh pingsan. Mereka sekarang dianggap 'downed' (tumbang) dan tidak dapat melakukan tindakan apa pun sampai mereka disembuhkan. Anda tidak perlu menggunakan tag khusus untuk ini; tag DAMAGE menangani perubahan HP.
    *   Jika SEMUA karakter pemain 'downed' (HP 0), Anda **HARUS** mendeskripsikan kekalahan total party. Respons Anda yang menceritakan kekalahan **HARUS diakhiri dengan tag \`GAME_OVER\` di baris baru.**
12. **Sistem Satuan:** Gunakan unit metrik (meter, kilogram).
13. **Fokus Narasi:** Selalu narasikan dari sudut pandang Karakter Utama, ${mainCharacter.name}. Sapa mereka sebagai "Anda". Anggota party lainnya adalah Rekan yang Anda kendalikan.
14. **Bahasa untuk Nama:** Nama lokasi, orang, dan item harus tetap dalam Bahasa Inggris. Jangan menerjemahkannya.`
    };

    const campaigns = {
        'lost-mine-of-phandelver': {
            en: `You are a master Dungeon Master running the "Lost Mine of Phandelver" campaign for Dungeons & Dragons 5th Edition for a solo player.

**CAMPAIGN PREMISE:**
The story begins on the Triboar Trail. The player's party has been hired by a dwarf named Gundren Rockseeker to escort a wagon of supplies to the rough-and-tumble frontier town of Phandalin. The journey is about 50 miles and takes a few days. The pay is 10 gold pieces each. You will start the adventure with the party traveling on the road, a couple of days out from Phandalin.

${commonRules.en}

**PARTY INFORMATION:**
Here is the current status of your party. Use their AC to resolve enemy attacks.

**Main Character:**${formatCharacterForPrompt(mainCharacter)}

**Companions:**${otherCharacters.length > 0 ? otherCharacters.map(formatCharacterForPrompt).join('') : '\n  - None'}

Now, begin the adventure. Your first response must have an AMBIANCE tag. Describe the scene on the Triboar Trail, with the party escorting the wagon. End your first message by setting up the first encounter (the goblin ambush with the dead horses) and ask the Main Character, "What do you do?". Do not ask the player to confirm, just start the story.`,
            id: `Anda adalah seorang Dungeon Master (DM) ahli yang menjalankan kampanye "Lost Mine of Phandelver" untuk Dungeons & Dragons Edisi ke-5 bagi pemain solo.

**PREMIS KAMPANYE:**
Cerita dimulai di Jalan Triboar. Party pemain telah disewa oleh seorang kurcaci bernama Gundren Rockseeker untuk mengawal gerobak pasokan ke kota perbatasan yang liar, Phandalin. Perjalanan ini sekitar 80 kilometer dan memakan waktu beberapa hari. Bayarannya adalah 10 keping emas untuk setiap orang. Anda akan memulai petualangan dengan party yang sedang melakukan perjalanan di jalan, beberapa hari sebelum mencapai Phandalin.

${commonRules.id}

**INFORMASI PARTY:**
Berikut adalah status terkini party Anda. Gunakan AC mereka untuk menyelesaikan serangan musuh.

**Karakter Utama:**${formatCharacterForPrompt(mainCharacter)}

**Rekan:**${otherCharacters.length > 0 ? otherCharacters.map(formatCharacterForPrompt).join('') : '\n  - Tidak ada'}

Sekarang, mulailah petualangan. Respons pertama Anda harus memiliki tag AMBIANCE. Deskripsikan adegan di Jalan Triboar, dengan party yang mengawal gerobak. Akhiri pesan pertama Anda dengan menyiapkan pertemuan pertama (penyergapan goblin dengan kuda-kuda mati) dan tanyakan pada Karakter Utama, "Apa yang kamu lakukan?". Jangan meminta konfirmasi pemain, langsung mulai ceritanya.`
        },
        'frozen-sick': {
            en: `You are a master Dungeon Master running the "Frozen Sick" adventure for Dungeons & Dragons 5th Edition for a solo player.

**CAMPAIGN PREMISE:**
The story begins in Palebank Village, a remote fishing outpost in the icy land of the Greying Wildlands. A mysterious illness called the "Frigid Woe" is spreading, causing sufferers to develop blue veins and become cold to the touch, though it's not immediately lethal. The party is hired to travel to the frozen island of Eiselcross to find the source of the plague and hopefully a cure.

${commonRules.en}

**PARTY INFORMATION:**
Here is the current status of your party. Use their AC to resolve enemy attacks.

**Main Character:**${formatCharacterForPrompt(mainCharacter)}

**Companions:**${otherCharacters.length > 0 ? otherCharacters.map(formatCharacterForPrompt).join('') : '\n  - None'}

Now, begin the adventure. Your first response must have an AMBIANCE tag. The party is gathered inside the "Jolly Dwarf" tavern in Palebank Village. Describe the cozy tavern, the chilling wind outside, and the worried looks on the faces of the locals. An important figure, Urgon Wenth, approaches their table with a proposition. Describe his appearance and begin the dialogue. End your first message by having Urgon ask the Main Character, "I hear you're looking for work. Might you be interested in a job that's vital to this community's survival? What do you say?". Do not ask the player to confirm, just start the story.`,
            id: `Anda adalah seorang Dungeon Master (DM) ahli yang menjalankan petualangan "Frozen Sick" untuk Dungeons & Dragons Edisi ke-5 bagi pemain solo.

**PREMIS KAMPANYE:**
Cerita dimulai di Desa Palebank, sebuah pos pemancingan terpencil di tanah es Greying Wildlands. Penyakit misterius yang disebut "Frigid Woe" (Penyakit Beku) menyebar, menyebabkan penderitanya mengalami urat biru dan menjadi dingin saat disentuh, meskipun tidak langsung mematikan. Party disewa untuk melakukan perjalanan ke pulau beku Eiselcross untuk menemukan sumber wabah dan semoga obatnya.

${commonRules.id}

**INFORMASI PARTY:**
Berikut adalah status terkini party Anda. Gunakan AC mereka untuk menyelesaikan serangan musuh.

**Karakter Utama:**${formatCharacterForPrompt(mainCharacter)}

**Rekan:**${otherCharacters.length > 0 ? otherCharacters.map(formatCharacterForPrompt).join('') : '\n  - Tidak ada'}

Sekarang, mulailah petualangan. Respons pertama Anda harus memiliki tag AMBIANCE. Party berkumpul di dalam kedai "Jolly Dwarf" di Desa Palebank. Deskripsikan kedai yang nyaman, angin dingin di luar, dan raut khawatir di wajah penduduk setempat. Seorang tokoh penting, Urgon Wenth, mendekati meja mereka dengan sebuah tawaran. Deskripsikan penampilannya dan mulailah dialog. Akhiri pesan pertama Anda dengan Urgon bertanya kepada Karakter Utama, "Saya dengar Anda sedang mencari pekerjaan. Mungkin Anda tertarik dengan pekerjaan yang sangat penting bagi kelangsungan hidup komunitas ini? Bagaimana?". Jangan meminta konfirmasi pemain, langsung mulai ceritanya.`
        },
        'beginner-journey': {
            en: `You are a Dungeon Master running "A Hero's First Steps," a beginner-friendly adventure for a solo player.

**CAMPAIGN PREMISE:**
The story starts in a cozy room at the "Weary Wanderer" inn, located in the peaceful town of Meadowbrook. The player character has just woken up to a quiet morning. This is a low-stakes starting point designed for exploration and getting used to the game.

${commonRules.en}

**PARTY INFORMATION:**
Here is the current status of your party. Use their AC to resolve enemy attacks.

**Main Character:**${formatCharacterForPrompt(mainCharacter)}

**Companions:**${otherCharacters.length > 0 ? otherCharacters.map(formatCharacterForPrompt).join('') : '\n  - None'}

Now, begin the adventure. Your first response must have an AMBIANCE tag. Describe the simple, sunlit tavern room. On the bedside table, there is a sealed note with the player's name on it and a small, clinking coin purse. Start by describing the scene and then ask the Main Character, "The morning sun streams through the window of your room. What do you do?". Do not ask the player to confirm, just start the story.`,
            id: `Anda adalah seorang Dungeon Master (DM) yang menjalankan "Langkah Pertama Pahlawan," sebuah petualangan yang ramah bagi pemula untuk pemain solo.

**PREMIS KAMPANYE:**
Cerita dimulai di sebuah kamar yang nyaman di penginapan "Pengembara Lelah," yang terletak di kota damai Meadowbrook. Karakter pemain baru saja bangun di pagi yang tenang. Ini adalah titik awal yang santai yang dirancang untuk eksplorasi dan membiasakan diri dengan permainan.

${commonRules.id}

**INFORMASI PARTY:**
Berikut adalah status terkini party Anda. Gunakan AC mereka untuk menyelesaikan serangan musuh.

**Karakter Utama:**${formatCharacterForPrompt(mainCharacter)}

**Rekan:**${otherCharacters.length > 0 ? otherCharacters.map(formatCharacterForPrompt).join('') : '\n  - Tidak ada'}

Sekarang, mulailah petualangan. Respons pertama Anda harus memiliki tag AMBIANCE. Deskripsikan kamar penginapan yang sederhana dan disinari matahari. Di atas meja samping tempat tidur, ada surat tersegel dengan nama pemain di atasnya dan sebuah kantong koin kecil yang bergemerincing. Mulailah dengan mendeskripsikan adegan tersebut dan kemudian tanyakan pada Karakter Utama, "Sinar matahari pagi masuk melalui jendela kamarmu. Apa yang kamu lakukan?". Jangan meminta konfirmasi pemain, langsung mulai ceritanya.`
        },
        'crossroads-of-destiny': {
            en: `You are a Dungeon Master running "The Crossroads of Destiny," a sandbox-style adventure for a solo player.

**CAMPAIGN PREMISE:**
This is a free-form, sandbox adventure. The story begins at the central crossroads of the Grand Bazaar in the massive, bustling city of Etheria. The player character is a newcomer to the city, seeking fame, fortune, or perhaps just a purpose. There are no predefined quests. Your role is to react to the player's actions, presenting opportunities, interesting NPCs, rumors, and potential plot hooks as they explore. Let the player lead the narrative.

${commonRules.en}

**PARTY INFORMATION:**
Here is the current status of your party. Use their AC to resolve enemy attacks.

**Main Character:**${formatCharacterForPrompt(mainCharacter)}

**Companions:**${otherCharacters.length > 0 ? otherCharacters.map(formatCharacterForPrompt).join('') : '\n  - None'}

Now, begin the adventure. Your first response must have an AMBIANCE tag. Describe the chaotic, vibrant, and overwhelming scene of the Grand Bazaar's central crossroads, filled with sounds, smells, and sights from a dozen different cultures. Then ask the Main Character, "The chaos of the Grand Bazaar of Etheria swirls around you, a newcomer in a vast city of possibilities. What do you do?". Do not ask the player to confirm, just start the story.`,
            id: `Anda adalah seorang Dungeon Master (DM) yang menjalankan "Persimpangan Takdir," petualangan gaya sandbox untuk pemain solo.

**PREMIS KAMPANYE:**
Ini adalah petualangan bebas berbentuk sandbox. Cerita dimulai di persimpangan pusat Grand Bazaar di kota besar yang ramai, Etheria. Karakter pemain adalah pendatang baru di kota, mencari ketenaran, kekayaan, atau mungkin hanya tujuan. Tidak ada misi yang telah ditentukan sebelumnya. Peran Anda adalah bereaksi terhadap tindakan pemain, menyajikan peluang, NPC yang menarik, rumor, dan potensi pengait plot saat mereka menjelajah. Biarkan pemain yang memimpin narasi.

${commonRules.id}

**INFORMASI PARTY:**
Berikut adalah status terkini party Anda. Gunakan AC mereka untuk menyelesaikan serangan musuh.

**Karakter Utama:**${formatCharacterForPrompt(mainCharacter)}

**Rekan:**${otherCharacters.length > 0 ? otherCharacters.map(formatCharacterForPrompt).join('') : '\n  - Tidak ada'}

Sekarang, mulailah petualangan. Respons pertama Anda harus memiliki tag AMBIANCE. Deskripsikan suasana yang kacau, bersemangat, dan luar biasa dari persimpangan pusat Grand Bazaar, dipenuhi dengan suara, bau, dan pemandangan dari berbagai budaya. Kemudian tanyakan pada Karakter Utama, "Kekacauan Grand Bazaar Etheria berputar di sekitarmu, seorang pendatang baru di kota besar yang penuh kemungkinan. Apa yang kamu lakukan?". Jangan meminta konfirmasi pemain, langsung mulai ceritanya.`
        }
    };
    return campaigns[campaign][lang];
}

export const createStoryChat = (party: FinalCharacter[], mainCharacterIndex: number, lang: 'en' | 'id', campaign: Campaign, initialHistory?: StoryEvent[]): Chat => {
    const systemInstruction = getSystemInstruction(campaign, party, mainCharacterIndex, lang);

    const mappedHistory: Content[] = (initialHistory || [])
        .filter(event => event.type === 'dm' || event.type === 'player')
        .map(event => {
            const role = (event.type === 'player') ? 'user' : 'model';
            return {
                role,
                parts: [{ text: event.text }]
            };
        });

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
        history: mappedHistory
    });
    return chat;
};

export const generateCharacterName = async (options: { race: string, characterClass: string, gender: string }, lang: 'en' | 'id'): Promise<string> => {
    const prompts = {
        en: `Generate a single, fitting, and cool-sounding fantasy name for a Dungeons & Dragons character.
    - Race: ${options.race}
    - Class: ${options.characterClass}
    - Gender: ${options.gender}
    Do not provide any explanation, just the name itself. For example: "Kaelen Shadowsun" or "Grizelda Ironhand".`,
        id: `Hasilkan satu nama fantasi yang cocok dan terdengar keren untuk karakter Dungeons & Dragons.
    - Ras: ${options.race}
    - Kelas: ${options.characterClass}
    - Gender: ${options.gender}
    Jangan berikan penjelasan apa pun, cukup namanya saja. Contoh: "Kaelen Shadowsun" atau "Grizelda Ironhand".`
    }

    try {
        apiUsageTracker.trackApiCall();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompts[lang],
        });
        return response.text.trim().replace(/"/g, ''); // Clean up potential quotes
    } catch (error) {
        console.error("Error generating character name:", error);
        return lang === 'en' ? `Mysterious ${options.race}` : `Ras ${options.race} Misterius`;
    }
};

export const generateBackgroundStory = async (options: CharacterOptions, lang: 'en' | 'id'): Promise<string> => {
  const prompts = {
      en: `
    Create a brief, compelling Dungeons & Dragons 5e background story (2-3 paragraphs) for the following character. Write it in English.
    - Race: ${options.race}
    - Class: ${options.characterClass}
    - Background: ${options.background}
    - Alignment: ${options.alignment}
    - Key Personality Trait: Base the story on their highest and lowest ability scores (Str: ${options.stats.strength}, Dex: ${options.stats.dexterity}, Con: ${options.stats.constitution}, Int: ${options.stats.intelligence}, Wis: ${options.stats.wisdom}, Cha: ${options.stats.charisma}).
    The story should be evocative and give them a clear motivation for adventuring. Do not include a name.
  `,
      id: `
    Buat cerita latar belakang Dungeons & Dragons 5e yang singkat dan menarik (2-3 paragraf) untuk karakter berikut. Tulis dalam Bahasa Indonesia.
    - Ras: ${options.race}
    - Kelas: ${options.characterClass}
    - Latar Belakang: ${options.background}
    - Alignment: ${options.alignment}
    - Ciri Kepribadian Utama: Dasarkan cerita pada skor kemampuan tertinggi dan terendah mereka (Kekuatan: ${options.stats.strength}, Kelincahan: ${options.stats.dexterity}, Konstitusi: ${options.stats.constitution}, Kecerdasan: ${options.stats.intelligence}, Kebijaksanaan: ${options.stats.wisdom}, Karisma: ${options.stats.charisma}).
    Cerita harus menggugah dan memberi mereka motivasi yang jelas untuk berpetualang. Jangan sertakan nama.
  `
  };
  try {
    apiUsageTracker.trackApiCall();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompts[lang],
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating background story:", error);
    throw new Error("Failed to generate background story from AI.");
  }
};

export const generateSpecialMove = async (options: CharacterOptions, lang: 'en' | 'id'): Promise<string> => {
  const prompt = `
      Based on the following Dungeons & Dragons character concept, create a single, cool-sounding, and descriptive name for a signature combat or utility move. The name MUST BE IN ENGLISH.
      - Race: ${options.race}
      - Class: ${options.characterClass}
      - Background: ${options.background}
      - Core Stats: Str: ${options.stats.strength}, Dex: ${options.stats.dexterity}, Con: ${options.stats.constitution}, Int: ${options.stats.intelligence}, Wis: ${options.stats.wisdom}, Cha: ${options.stats.charisma}.
      - Skill Proficiencies: ${options.selectedSkills.join(', ') || 'None specified'}
      - Fighting Style: ${options.fightingStyle}
      
      The move should reflect their strengths and theme. Provide only the name of the move, IN ENGLISH, without any explanation. For example: "Sun-Blessed Strike" or "Shadow-Weaver's Feint".
    `;
 
  try {
    apiUsageTracker.trackApiCall();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text.trim().replace(/"/g, '');
  } catch (error) {
    console.error("Error generating special move:", error);
    throw new Error("Failed to generate special move from AI.");
  }
};


export const generateCharacterDetails = async (
  options: CharacterOptions, lang: 'en' | 'id'
): Promise<GeneratedData> => {
  try {
    apiUsageTracker.trackApiCall();
    const hairStyle = options.hairType === 'Other' && options.customHairType ? options.customHairType : options.hairType;
    const accessory = options.accessories === 'Other' && options.customAccessory ? options.customAccessory : options.accessories;

    const prompt = lang === 'en' ? `
      Based on a Dungeons & Dragons 5e character with the following detailed attributes, generate a rich character profile in English.
      
      USER-PROVIDED DETAILS:
      - Name: ${options.name || 'Unnamed'}
      - Race: ${options.race}
      - Class: ${options.characterClass}
      - Background: ${options.background}
      - Alignment: ${options.alignment}
      - Gender: ${options.gender}
      - Age: ${options.age} years old
      - Appearance: ${getAgeDescription(options.age, 'en')}, ${getHeightDescription(options.height, 'en')}, ${getBuildDescription(options.build, 'en')}, ${getMuscularityDescription(options.muscularity, 'en')}. Hair is ${hairStyle} with color ${options.hairColor}. Primary clothing color theme is ${options.clothColor}. Wears: ${accessory}.
      - Core Stats: Strength ${options.stats.strength}, Dexterity ${options.stats.dexterity}, Constitution ${options.stats.constitution}, Intelligence ${options.stats.intelligence}, Wisdom ${options.stats.wisdom}, Charisma ${options.stats.charisma}.
      - Preferences: Favors fighting in ${options.favoriteTerrain} terrain against ${options.favoriteEnemy}.
      - Fighting Style: ${options.fightingStyle}
      - Selected Skill Proficiencies: ${options.selectedSkills.join(', ') || 'None specified'}
      - Custom Backstory: ${options.backgroundStory || 'None provided. Please create one based on their race, class, and background.'}
      - Custom Special Move Name: ${options.customSpecialMove || 'None provided. Please create one.'}

      GENERATE THE FOLLOWING JSON:
      1.  **characterDescription**: A brief, evocative paragraph describing the character's personality, demeanor, and appearance based on all the details provided.
      2.  **startingItems**: A thematic list of starting equipment. Include standard class/background gear and one or two unique, flavorful items. A character should have at least one weapon and one piece of armor/shield.
      3.  **skills**: A list of additional flavorful talents, quirks, or non-combat abilities that complement their specified proficiencies.
      4.  **specialMove**: An object for the character's signature move.
          - **name**: A cool-sounding, descriptive name for the move, IN ENGLISH. If a custom name was provided by the user, use it.
          - **description**: A brief but detailed explanation (1-2 sentences) of what the move does, how it looks, or its in-game effect.
      5.  **currency**: A starting amount of wealth based on their background (e.g., a Noble would have more than an Urchin).
    ` : `
      Berdasarkan karakter Dungeons & Dragons 5e dengan atribut terperinci berikut, hasilkan profil karakter yang kaya.
      
      DETAIL DARI PENGGUNA:
      - Nama: ${options.name || 'Tanpa Nama'}
      - Ras: ${options.race}
      - Kelas: ${options.characterClass}
      - Latar Belakang: ${options.background}
      - Alignment: ${options.alignment}
      - Gender: ${options.gender}
      - Usia: ${options.age} tahun
      - Penampilan: ${getAgeDescription(options.age, 'id')}, ${getHeightDescription(options.height, 'id')}, ${getBuildDescription(options.build, 'id')}, ${getMuscularityDescription(options.muscularity, 'id')}. Gaya rambut ${hairStyle} dengan warna ${options.hairColor}. Tema warna pakaian utama adalah ${options.clothColor}. Mengenakan: ${accessory}.
      - Statistik Inti: Kekuatan ${options.stats.strength}, Kelincahan: ${options.stats.dexterity}, Konstitusi ${options.stats.constitution}, Kecerdasan ${options.stats.intelligence}, Kebijaksanaan: ${options.stats.wisdom}, Karisma: ${options.stats.charisma}.
      - Preferensi: Suka bertarung di medan ${options.favoriteTerrain} melawan ${options.favoriteEnemy}.
      - Gaya Bertarung: ${options.fightingStyle}
      - Kemahiran Keterampilan yang Dipilih: ${options.selectedSkills.join(', ') || 'Tidak ditentukan'}
      - Latar Belakang Kustom: ${options.backgroundStory || 'Tidak ada. Tolong buatkan satu berdasarkan ras, kelas, dan latar belakang mereka.'}
      - Nama Jurus Spesial Kustom: ${options.customSpecialMove || 'Tidak ada. Tolong buatkan satu.'}

      PENTING: Untuk 'startingItems' dan 'specialMove.name', berikan nama dalam Bahasa Inggris. Semua deskripsi lain, termasuk 'specialMove.description', harus dalam Bahasa Indonesia.

      HASILKAN JSON BERIKUT:
      1.  **characterDescription**: Paragraf singkat yang menggambarkan kepribadian, sikap, dan penampilan karakter berdasarkan semua detail yang diberikan. (dalam Bahasa Indonesia)
      2.  **startingItems**: Daftar tematik perlengkapan awal. Sertakan perlengkapan standar kelas/latar belakang dan item unik. Karakter harus memiliki setidaknya satu senjata dan satu zirah/perisai. (Nama dalam Bahasa Inggris)
      3.  **skills**: Daftar bakat atau kemampuan non-tempur tambahan yang melengkapi kemahiran yang ditentukan. (dalam Bahasa Indonesia)
      4.  **specialMove**: Sebuah objek untuk jurus khas karakter.
          - **name**: Nama jurus yang keren dan deskriptif dalam Bahasa Inggris. Jika nama kustom diberikan pengguna, gunakan itu.
          - **description**: Penjelasan singkat namun detail (1-2 kalimat) tentang apa yang dilakukan jurus spesial ini, bagaimana kelihatannya, atau efeknya di dalam game. Tulis deskripsi ini dalam Bahasa Indonesia.
      5.  **currency**: Jumlah kekayaan awal berdasarkan latar belakang mereka (misalnya, seorang Bangsawan akan memiliki lebih dari seorang Gelandangan).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characterDescription: { type: Type.STRING },
            startingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            specialMove: { 
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The name of the move in English." },
                    description: { type: Type.STRING, description: "A detailed description of the move in the requested language." }
                },
                required: ["name", "description"]
            },
            currency: {
                type: Type.OBJECT,
                properties: {
                    gp: { type: Type.NUMBER },
                    sp: { type: Type.NUMBER },
                    cp: { type: Type.NUMBER },
                },
                required: ["gp", "sp", "cp"]
            }
          },
          required: ["characterDescription", "startingItems", "skills", "specialMove", "currency"],
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as GeneratedData;

  } catch (error) {
    console.error("Error generating character details:", error);
    throw new Error("Failed to generate character details from AI.");
  }
};

export const generateCharacterImage = async (options: CharacterOptions, lang: 'en' | 'id'): Promise<string> => {
    const heightDesc = getHeightDescription(options.height, lang);
    const buildDesc = getBuildDescription(options.build, lang);
    const muscularityDesc = getMuscularityDescription(options.muscularity, lang);
    const ageDesc = getAgeDescription(options.age, lang);

    // Armor/Clothing logic based on class
    let clothingDescription = '';
    const heavyArmorClasses = ["Fighter", "Paladin", "Cleric"];
    const lightArmorClasses = ["Ranger", "Rogue", "Bard", "Warlock"];
    const noArmorClasses = ["Monk", "Sorcerer", "Wizard"];

    if (heavyArmorClasses.includes(options.characterClass)) {
        clothingDescription = `wearing detailed, practical fantasy armor (like plate or chainmail)`;
    } else if (lightArmorClasses.includes(options.characterClass)) {
        clothingDescription = `wearing practical fantasy clothing with some leather armor elements`;
    } else if (noArmorClasses.includes(options.characterClass)) {
        clothingDescription = `wearing robes or clothing appropriate for a spellcaster, with no metal armor`;
    } else if (options.characterClass === "Barbarian") {
        clothingDescription = `wearing rugged leathers, furs, and hide armor`;
    } else if (options.characterClass === "Druid") {
        clothingDescription = `wearing clothing made of natural materials like leaves, wood, and leather, with no metal armor`;
    } else {
        clothingDescription = `wearing detailed fantasy clothing appropriate for a ${options.characterClass}`;
    }
    
    // Hair logic
    const hairStyle = options.hairType === 'Other' && options.customHairType ? options.customHairType : options.hairType;
    
    // Accessory logic
    let accessoryDesc = '';
    if (options.accessories && options.accessories !== 'None') {
        const accessory = options.accessories === 'Other' && options.customAccessory ? options.customAccessory : options.accessories;
        accessoryDesc = `The character is also wearing ${accessory}.`;
    }

    // Race-specific logic
    let raceSpecifics = '';
    if (options.race === 'Human') {
        raceSpecifics = 'The character is a Human with standard, rounded ears (not pointed elf-like ears).';
    }

    const prompt = `
        A high-quality, detailed fantasy digital painting portrait of a D&D character.
        The character is a ${options.gender} ${options.race} ${options.characterClass}, who is ${ageDesc} (around ${options.age} years old).
        Physically, they are ${heightDesc}, ${buildDesc}, and ${muscularityDesc}, with a skin tone of ${options.skinColor}.
        Their hair is styled as: ${hairStyle}, and its color is strictly ${options.hairColor}.
        They are ${clothingDescription}, with a color scheme centered around ${options.clothColor}.
        ${accessoryDesc}
        ${raceSpecifics}
        The portrait has dramatic lighting in an epic fantasy art style, highly detailed. No text or watermarks. The overall color palette should complement the character's clothing theme, but the hair color must be precisely ${options.hairColor}.
    `;

    try {
        apiUsageTracker.trackApiCall();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const mimeType = part.inlineData.mimeType;
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }
        }
        
        throw new Error("No image was generated by the model.");

    } catch (error) {
        console.error("Error generating character image:", error);
        throw new Error("Failed to generate character image from AI.");
    }
};

export const generateAmbianceImage = async (description: string): Promise<string> => {
    const prompt = `
        Stunning, atmospheric, high-quality fantasy digital painting of a location. 
        Scene: ${description}.
        Style: Dramatic lighting, epic fantasy art, detailed, sense of scale and mood. 
        Important: No text, no watermarks, no user interface elements, no characters unless specified in the scene description.
    `;

    try {
        apiUsageTracker.trackApiCall();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9',
            },
        });
        
        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("No ambiance image was generated.");
        }

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;

    } catch (error) {
        console.error("Error generating ambiance image:", error);
        throw new Error("Failed to generate ambiance image from AI.");
    }
};
