const utils = require("./utils");

/**
 *  @schema Chapter
 *  type: object
 *  required:
 *      - sura_number
 *      - sura_name
 *  properties:
 *      sura_number:
 *          type: integer
 *          description: the number of the surah (acting as the surah id)
 *          example: 1
 *      sura_name:
 *          type: string
 *          description: the name of the surah
 *          example: al-Fātihah
 */
async function getChapters(data) {
    let sql = "SELECT * FROM suras";
    return await utils.retrieve(
        sql,
        [],
        new utils.Message({
            success: `Successfully fetched all suras.`,
        })
    );
}

/**
 *  @schema Verse
 *  type: object
 *  required:
 *      - index
 *      - sura
 *      - aya
 *      - text
 *  properties:
 *      index:
 *          type: integer
 *          description: the index of the verse in the quran
 *          example: 1
 *      sura:
 *          type: integer
 *          description: the sura id/number that the verse belongs to
 *          example: 1
 *      aya:
 *          type: integer
 *          description: the aya number within the surah
 *          example: 1
 *      text:
 *          type: string
 *          description: the text representation of the verse
 *          example: بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ
 */
async function getChapterVerses(data) {
    var invalid = utils.simpleValidation(data, {
        sura_number: "integer",
    });
    if (invalid) {
        return invalid;
    }
    let sql = "SELECT * FROM quran_text WHERE sura=$1";
    var params = [data.sura_number];
    let verses = await utils.retrieve(
        sql,
        params,
        new utils.Message({
            success: `Successfully fetched verses for sura number ${data.sura_number}.`,
        })
    );
    if (verses.data.length > 0) {
        verses.data.sort((a, b) => (a.aya > b.aya ? 1 : -1));
    }
    return verses;
}

async function getVerse(data) {
    var invalid = utils.simpleValidation(data, {
        verse_id: "integer",
    });
    if (invalid) {
        return invalid;
    }
    let sql = "SELECT * FROM quran_text WHERE aya=$1";
    var params = [data.verse_id];
    let verse = await utils.retrieve(
        sql,
        params,
        new utils.Message({
            success: `Successfully fetched verse with id ${data.verse_id}.`,
        })
    );
    verse.data = verse.data[0];
    return verse;
}

/**
 *  @schema RootWord
 *  type: object
 *  required:
 *      - indexid
 *      - wordid
 *      - word
 *      - rootid
 *      - rootword
 *      - meanings
 *  properties:
 *      indexid:
 *          type: Integer
 *          description: the index of the verse in the quran
 *          example: 1
 *      wordid:
 *          type: integer
 *          description: the id pertaining to a specific word in the verse
 *          example: 2000
 *      word:
 *          type: string
 *          description: a specific word in the verse
 *          example: بِسْمِ
 *      rootid:
 *          type: integer
 *          description: the id of the root word associated with the specific word in the verse
 *          example: 936
 *      rootword:
 *          type: integer
 *          description: string representaiton of the root word with spaces in between each letter.
 *          example: س م و
 *      meanings:
 *          type: string
 *          description: the meanings associated with the root word
 *          example: to be high/lofty, raised, name, attribute. samawat - heights/heavens/rain, raining clouds. ismun - mark of identification by which one is recognised. It is a derivation of wsm (pl. asma). ism - stands for a distinguishing mark of a thing, sometimes said to signify its reality.
 */
async function getVerseRootWords(data) {
    var invalid = utils.simpleValidation(data, {
        verse_id: "integer",
    });
    if (invalid) {
        return invalid;
    }
    let sql =
        "SELECT * FROM (SELECT * FROM (SELECT indexID, aw.wordID, word, rootid FROM TextToWord as ttw JOIN ArabicWord as aw on aw.WordID=ttw.WordID WHERE indexID=$1) as taw JOIN RootWord as rt ON rt.RootID=taw.rootID) rtw JOIN rootmeaning rm ON rm.rootword=rtw.rootword;";
    var params = [data.verse_id];
    let roots = await utils.retrieve(
        sql,
        params,
        new utils.Message({
            success: `Successfully fetched roots for verse with id ${data.verse_id}.`,
        })
    );
    // We then want to sort the words by verse
    let verseRes = await getVerse(data);
    let wordArray = verseRes.data.text.split(" ");

    // Note that indexOf returns -1 when the word is not found
    roots.data.sort((a, b) =>
        wordArray.indexOf(a.word) > wordArray.indexOf(b.word) ? 1 : -1
    );
    return roots;
}
async function getRootMeanings(data) {
    var all_roots = await getVerseRootWords(data);
    let msg = all_roots.error;
    let root, word, rootmeaning, sentence;
    if (all_roots.success) {
        for (let item of all_roots.data) {
            root = item.rootword;
            word = item.word;
            rootmeaning = item.meanings;
            sentence = `The word ${word} comes from the root ${root} and is associated with the meanings: ${rootmeaning}`;
            item.sentence = sentence;
        }
        msg = `Successfully retreived sentences for each word in verse with id ${data.verse_id}`;
    }
    return utils.setResult(
        all_roots.data,
        all_roots.success,
        msg,
        all_roots.ecode
    );
}

module.exports = {
    getChapterVerses,
    getChapters,
    getVerseRootWords,
    getRootMeanings,
};
