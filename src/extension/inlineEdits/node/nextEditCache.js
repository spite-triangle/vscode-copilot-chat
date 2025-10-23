"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NextEditCache = void 0;
const observable_1 = require("../../../platform/inlineEdits/common/utils/observable");
const cache_1 = require("../../../util/common/cache");
const tracing_1 = require("../../../util/common/tracing");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
const editRebase_1 = require("../common/editRebase");
class NextEditCache extends lifecycle_1.Disposable {
    constructor(workspace, _logService) {
        super();
        this.workspace = workspace;
        this._logService = _logService;
        this._documentCaches = new Map();
        this._sharedCache = new cache_1.LRUCache(50);
        (0, observableInternal_1.mapObservableArrayCached)(this, workspace.openDocuments, (doc, store) => {
            const state = new DocumentEditCache(this, doc.id, doc, this._sharedCache, this._logService);
            this._documentCaches.set(state.docId, state);
            store.add((0, observable_1.autorunWithChanges)(this, {
                value: doc.value,
            }, (data) => {
                for (const edit of data.value.changes) {
                    if (!edit.isEmpty()) {
                        state.handleEdit(edit);
                    }
                }
            }));
            store.add((0, lifecycle_1.toDisposable)(() => {
                this._documentCaches.delete(doc.id);
            }));
        }).recomputeInitiallyAndOnChange(this._store);
    }
    setKthNextEdit(docId, documentContents, editWindow, nextEdit, subsequentN, nextEdits, userEditSince, source) {
        const docCache = this._documentCaches.get(docId);
        if (!docCache) {
            return;
        }
        return docCache.setKthNextEdit(documentContents, editWindow, nextEdit, nextEdits, userEditSince, subsequentN, source);
    }
    setNoNextEdit(docId, documentContents, editWindow, source, nesConfigs) {
        const docCache = this._documentCaches.get(docId);
        if (!docCache) {
            return;
        }
        docCache.setNoNextEdit(documentContents, editWindow, source, nesConfigs);
    }
    lookupNextEdit(docId, currentDocumentContents, currentSelection, nesConfigs) {
        const docCache = this._documentCaches.get(docId);
        if (!docCache) {
            return undefined;
        }
        return docCache.lookupNextEdit(currentDocumentContents, currentSelection, nesConfigs);
    }
    tryRebaseCacheEntry(cachedEdit, currentDocumentContents, currentSelection, nesConfigs) {
        const docCache = this._documentCaches.get(cachedEdit.docId);
        if (!docCache) {
            return undefined;
        }
        return docCache.tryRebaseCacheEntry(cachedEdit, currentDocumentContents, currentSelection, nesConfigs);
    }
    rejectedNextEdit(requestId) {
        this._sharedCache.getValues()
            .filter(v => v.source.headerRequestId === requestId)
            .forEach(v => v.rejected = true);
    }
    isRejectedNextEdit(docId, currentDocumentContents, edit, nesConfigs) {
        const docCache = this._documentCaches.get(docId);
        if (!docCache) {
            return false;
        }
        return docCache.isRejectedNextEdit(currentDocumentContents, edit, nesConfigs);
    }
    evictedCachedEdit(cachedEdit) {
        const docCache = this._documentCaches.get(cachedEdit.docId);
        if (docCache) {
            docCache.evictedCachedEdit(cachedEdit);
        }
    }
    clear() {
        this._documentCaches.forEach(cache => cache.clear());
        this._sharedCache.clear();
    }
}
exports.NextEditCache = NextEditCache;
class DocumentEditCache {
    constructor(_nextEditCache, docId, _doc, _sharedCache, _logService) {
        this._nextEditCache = _nextEditCache;
        this.docId = docId;
        this._doc = _doc;
        this._sharedCache = _sharedCache;
        this._logService = _logService;
        this._trackedCachedEdits = [];
        this._tracer = (0, tracing_1.createTracer)(['NES', 'DocumentEditCache'], (s) => this._logService.trace(s));
    }
    handleEdit(edit) {
        const tracer = this._tracer.sub('handleEdit');
        for (const cachedEdit of this._trackedCachedEdits) {
            if (cachedEdit.userEditSince) {
                cachedEdit.userEditSince = cachedEdit.userEditSince.compose(edit);
                cachedEdit.rebaseFailed = false;
                if (!(0, editRebase_1.checkEditConsistency)(cachedEdit.documentBeforeEdit.value, cachedEdit.userEditSince, this._doc.value.get().value, tracer)) {
                    cachedEdit.userEditSince = undefined;
                }
            }
        }
    }
    evictedCachedEdit(cachedEdit) {
        const index = this._trackedCachedEdits.indexOf(cachedEdit);
        if (index !== -1) {
            this._trackedCachedEdits.splice(index, 1);
        }
    }
    clear() {
        this._trackedCachedEdits.length = 0;
    }
    setKthNextEdit(documentContents, editWindow, nextEdit, nextEdits, userEditSince, subsequentN, source) {
        const key = this._getKey(documentContents.value);
        const cachedEdit = { docId: this.docId, edit: nextEdit, edits: nextEdits, detailedEdits: [], userEditSince, subsequentN, source, documentBeforeEdit: documentContents, editWindow, cacheTime: Date.now() };
        if (userEditSince) {
            if (!(0, editRebase_1.checkEditConsistency)(cachedEdit.documentBeforeEdit.value, userEditSince, this._doc.value.get().value, this._tracer.sub('setKthNextEdit'))) {
                cachedEdit.userEditSince = undefined;
            }
            else {
                this._trackedCachedEdits.unshift(cachedEdit);
            }
        }
        const existing = this._sharedCache.get(key);
        if (existing) {
            this.evictedCachedEdit(existing);
        }
        const evicted = this._sharedCache.put(key, cachedEdit);
        if (evicted) {
            this._nextEditCache.evictedCachedEdit(evicted[1]);
        }
        return cachedEdit;
    }
    setNoNextEdit(documentContents, editWindow, source, nesConfigs) {
        const key = this._getKey(documentContents.value);
        const cachedEdit = { docId: this.docId, edits: [], detailedEdits: [], source, documentBeforeEdit: documentContents, editWindow, cacheTime: Date.now() };
        const existing = this._sharedCache.get(key);
        if (existing) {
            this.evictedCachedEdit(existing);
        }
        const evicted = this._sharedCache.put(key, cachedEdit);
        if (evicted) {
            this._nextEditCache.evictedCachedEdit(evicted[1]);
        }
    }
    lookupNextEdit(currentDocumentContents, currentSelection, nesConfigs) {
        // TODO@chrmarti: Update entries i > 1 with user edits and edit window and start tracking.
        const key = this._getKey(currentDocumentContents.value);
        const cachedEdit = this._sharedCache.get(key);
        if (cachedEdit) {
            const editWindow = cachedEdit.editWindow;
            const cursorRange = currentSelection[0];
            if (editWindow && cursorRange && !editWindow.containsRange(cursorRange)) {
                return undefined;
            }
            return cachedEdit;
        }
        if (!nesConfigs.isRevisedCacheStrategy) {
            return undefined;
        }
        for (const cachedEdit of this._trackedCachedEdits) {
            const rebased = this.tryRebaseCacheEntry(cachedEdit, currentDocumentContents, currentSelection, nesConfigs);
            if (rebased) {
                return rebased;
            }
        }
        return undefined;
    }
    tryRebaseCacheEntry(cachedEdit, currentDocumentContents, currentSelection, nesConfigs) {
        const tracer = this._tracer.sub('tryRebaseCacheEntry');
        if (cachedEdit.userEditSince && !cachedEdit.rebaseFailed) {
            const originalEdits = cachedEdit.edits || (cachedEdit.edit ? [cachedEdit.edit] : []);
            const res = (0, editRebase_1.tryRebase)(cachedEdit.documentBeforeEdit.value, cachedEdit.editWindow, originalEdits, cachedEdit.detailedEdits, cachedEdit.userEditSince, currentDocumentContents.value, currentSelection, 'strict', tracer, nesConfigs);
            if (res === 'rebaseFailed') {
                cachedEdit.rebaseFailed = true;
            }
            else if (res === 'inconsistentEdits' || res === 'error') {
                cachedEdit.userEditSince = undefined;
            }
            else if (res === 'outsideEditWindow') {
                // miss
            }
            else if (res.length) {
                if (!cachedEdit.rejected && this.isRejectedNextEdit(currentDocumentContents, res[0].rebasedEdit, nesConfigs)) {
                    cachedEdit.rejected = true;
                }
                return { ...cachedEdit, ...res[0] };
            }
            else if (!originalEdits.length) {
                return cachedEdit; // cached 'no edits'
            }
        }
        return undefined;
    }
    isRejectedNextEdit(currentDocumentContents, edit, nesConfigs) {
        const tracer = this._tracer.sub('isRejectedNextEdit');
        const resultEdit = edit.removeCommonSuffixAndPrefix(currentDocumentContents.value);
        for (const rejectedEdit of this._trackedCachedEdits.filter(edit => edit.rejected)) {
            if (!rejectedEdit.userEditSince) {
                continue;
            }
            const edits = rejectedEdit.edits || (rejectedEdit.edit ? [rejectedEdit.edit] : []);
            if (!edits.length) {
                continue; // cached 'no edits'
            }
            const rejectedEdits = (0, editRebase_1.tryRebase)(rejectedEdit.documentBeforeEdit.value, undefined, edits, rejectedEdit.detailedEdits, rejectedEdit.userEditSince, currentDocumentContents.value, [], 'lenient', tracer, nesConfigs);
            if (typeof rejectedEdits === 'string') {
                continue;
            }
            const rejected = rejectedEdits.some(rejected => rejected.rebasedEdit.removeCommonSuffixAndPrefix(currentDocumentContents.value).equals(resultEdit));
            if (rejected) {
                tracer.trace('Found rejected edit that matches current edit');
                return true;
            }
        }
        return false;
    }
    _getKey(val) {
        return JSON.stringify([this.docId.uri, val]);
    }
}
//# sourceMappingURL=nextEditCache.js.map