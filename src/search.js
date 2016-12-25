var Util = require('./utility');

var index = {}; // key: at most three-letter combinations, value: array of data-key
var selectionNodeHash = {}; // key: data-key, value: DOM node
var selectionNodeHashKeys = [];

var sectionNodeHash = {};
var sectionNodeHashKeys = [];

const SAMPLE_SIZE = 3;

function addToIndex(key, id) {
  for (var ii = 1; ii <= SAMPLE_SIZE; ++ii) {
    for (var jj = 0; jj < key.length - ii + 1; ++jj) {
      var minikey = key.substring(jj, jj + ii);

      if (!index[minikey]) {
        index[minikey] = [];
      }

      // don't duplicate
      // this takes advantage of the fact that the minikeys with same id's are added sequentially
      var length = index[minikey].length;
      if (length === 0 || index[minikey][length - 1] !== id) {
        index[minikey].push(id);
      }
    }
  }
}

// split word into three letter (or less) pieces
function splitWord(word) {
  if (!word) {
    return [];
  }

  if (word.length < SAMPLE_SIZE) {
    return [word];
  }

  var chunks = [];
  for (var ii = 0; ii < word.length - SAMPLE_SIZE + 1; ++ii) {
    chunks.push(word.substring(ii, ii + SAMPLE_SIZE));
  }
  return chunks;
}

function buildIndex(options, inSelectionNodeHash, inSectionNodeHash) {
  // options are sorted by id already
  // trigrams
  for (var ii = 0; ii < options.length; ++ii) {
    var option = options[ii];
    var searchWords = Util.array.removeFalseyExceptZero([option.value, option.text, option.description, option.section]).map((item) => {
      return item.toLowerCase();
    });

    for (var jj = 0; jj < searchWords.length; ++jj) {
      var words = searchWords[jj].split(' ');
      for (var kk = 0; kk < words.length; ++kk) {
        addToIndex(words[kk], option.id);
      }
    }
  }
  selectionNodeHash = inSelectionNodeHash;
  selectionNodeHashKeys = Object.keys(inSelectionNodeHash);

  sectionNodeHash = inSectionNodeHash;
  sectionNodeHashKeys = Object.keys(inSectionNodeHash);
}

function search(value) {
  if (!value) {
    selectionNodeHashKeys.forEach((id) => {
      selectionNodeHash[id].style.display = '';
    });
    sectionNodeHashKeys.forEach((id) => {
      sectionNodeHash[id].style.display = '';
    });
    return;
  }

  value = value.toLowerCase();

  var searchWords = value.split(' ');
  var searchChunks = [];
  searchWords.forEach((searchWord) => {
    var chunks = splitWord(searchWord);
    chunks.forEach((chunk) => {
      searchChunks.push(index[chunk] || []);
    });
  });

  // since the the indices are sorted, keep track of index locations as we progress
  var indexLocations = [];
  var maxIndexLocations = [];
  searchChunks.forEach((chunk) => {
    indexLocations.push(0);
    maxIndexLocations.push(chunk.length - 1);
  });

  var finalOutput = [];
  for (; indexLocations.length > 0 && indexLocations[0] <= maxIndexLocations[0]; ++indexLocations[0]) {
    // advance indices to be at least equal to first array element
    var terminate = false;
    for (var ii = 1; ii < searchChunks.length; ++ii) {
      while (searchChunks[ii][indexLocations[ii]] < searchChunks[0][indexLocations[0]] &&
             indexLocations[ii] <= maxIndexLocations[ii]) {
        ++indexLocations[ii];
      }
      if (indexLocations[ii] > maxIndexLocations[ii]) {
        terminate = true;
        break;
      }
    }

    if (terminate) {
      break;
    }

    // check element equality
    var shouldAdd = true;
    for (var jj = 1; jj < searchChunks.length; ++jj) {
      if (searchChunks[0][indexLocations[0]] !== searchChunks[jj][indexLocations[jj]]) {
        shouldAdd = false;
        break;
      }
    }

    if (shouldAdd) {
      finalOutput.push(searchChunks[0][indexLocations[0]]);
    }
  }

  // now we have id's that match search query
  var finalOutputHash = {};
  var sectionsToNotHideHash = {};
  finalOutput.forEach((id) => {
    finalOutputHash[id] = true;
    var node = selectionNodeHash[id];
    node.style.display = '';

    // now search for parent sections
    node = node.parentNode;
    while (!node.className.match(/tree-multiselect/)) {
      if (node.className.match(/section/)) {
        var key = Util.getKey(node);
        Util.assert(key || key === 0);
        if (sectionsToNotHideHash[key]) {
          break;
        } else {
          sectionsToNotHideHash[key] = true;
          node.style.display = '';
        }
      }
      node = node.parentNode;
    }
  });

  // hide selections
  selectionNodeHashKeys.forEach((id) => {
    if (!finalOutputHash[id]) {
      selectionNodeHash[id].style.display = 'none';
    }
  });
  sectionNodeHashKeys.forEach((id) => {
    if (!sectionsToNotHideHash[id]) {
      sectionNodeHash[id].style.display = 'none';
    }
  });
}

module.exports = {
  buildIndex: buildIndex,
  search: search
};
