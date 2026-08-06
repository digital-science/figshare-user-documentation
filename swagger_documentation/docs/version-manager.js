/**
 * API Version Management for Swagger Documentation
 * This module handles loading and switching between different API versions
 */

(function() {
    'use strict';

    // Configuration. Absolute so it resolves the same way whether this script is loaded from
    // /, /v2/, or /v3/ (served bundles) or from the generator's dev-preview server.
    var VERSIONS_MANIFEST_URL = '/docs/versions_manifest.json';
    var versionsData = null;
    var currentVersion = null;

    /**
     * Reflect the active API version in the browser tab title (e.g. "Figshare API v3").
     */
    function updateDocumentTitle(version) {
        if (version) {
            document.title = 'Figshare API v' + version;
        }
    }

    /**
     * Load versions manifest from the server
     */
    function loadVersionsManifest() {
        return fetch(VERSIONS_MANIFEST_URL)
            .then(function(response) {
                if (!response.ok) {
                    console.warn('Versions manifest not found, using default swagger.json');
                    return null;
                }
                return response.json();
            })
            .then(function(data) {
                versionsData = data;
                return data;
            })
            .catch(function(error) {
                console.error('Error loading versions manifest:', error);
                return null;
            });
    }

    /**
     * Populate the version selector dropdown
     */
    function populateVersionSelector() {
        var select = document.getElementById('apiVersionSelect');
        if (!select) {
            console.warn('Version selector not found in DOM');
            return;
        }

        if (!versionsData || !versionsData.versions) {
            // No versions data, hide the selector
            var versionSelector = select.closest('.version-selector');
            if (versionSelector) {
                versionSelector.style.display = 'none';
            }
            return;
        }

        // The active version is fixed per served bundle (window.FIGSHARE_DOC_VERSION, baked in at
        // build time), or comes from ?version= while previewing on the generator's dev server;
        // fall back to the manifest default only if neither is present.
        var selectedVersion = window.FIGSHARE_DOC_VERSION || getVersionFromUrl() || versionsData.default_version;

        // Ensure we have a valid selected version
        if (!selectedVersion) {
            selectedVersion = versionsData.default_version;
        }

        // Build every option into a detached fragment first, then attach them to the select in
        // one atomic swap. Clearing the select and appendChild-ing options one at a time (the
        // previous approach) leaves a brief window where only the first-appended option exists
        // and nothing has been marked selected yet -- the browser implicitly treats that option
        // as selected, which is visible as the dropdown flashing the wrong version (manifest is
        // sorted newest-first, so that's always the highest version) before settling on the
        // correct one a moment later.
        var fragment = document.createDocumentFragment();

        // Add options for each version
        versionsData.versions.forEach(function(versionInfo) {
            var option = document.createElement('option');
            option.value = versionInfo.version;
            
            var label = 'v' + versionInfo.version;
            
            // Add status indicators
            if (versionInfo.deprecated) {
                label += ' (Deprecated)';
            }
            if (versionInfo.version === versionsData.default_version) {
                label += ' - Current';
            }
            
            option.textContent = label;
            option.setAttribute('data-deprecated', versionInfo.deprecated || false);
            option.setAttribute('data-description', versionInfo.description || '');
            
            if (versionInfo.sunset) {
                option.setAttribute('data-sunset', versionInfo.sunset);
            }
            if (versionInfo.successor) {
                option.setAttribute('data-successor', versionInfo.successor);
            }
            if (versionInfo.doc_url) {
                option.setAttribute('data-doc-url', versionInfo.doc_url);
            }
            
            // Select this option if it matches saved/default version
            if (versionInfo.version === selectedVersion) {
                option.selected = true;
                currentVersion = versionInfo.version;
                updateDocumentTitle(currentVersion);
            }
            
            fragment.appendChild(option);
        });

        // Single atomic swap: the select goes straight from its old contents to the fully built,
        // correctly-selected option set, with no intermediate partially-populated state.
        select.innerHTML = '';
        select.appendChild(fragment);

        // Add change event listener
        select.addEventListener('change', handleVersionChange);

        // Ensure the selected version is set (fallback)
        if (currentVersion) {
            select.value = currentVersion;
        }

        // Show deprecation warning if current version is deprecated
        updateDeprecationWarning(selectedVersion);
    }

    /**
     * Handle version selection change: navigate to the versioned bundle rather than hot-swapping
     * the spec in place (that was the source of the refresh/bookmark desync this replaces).
     */
    function handleVersionChange(event) {
        var newVersion = event.target.value;
        window.location.href = '/v' + newVersion.split('.')[0] + '/';
    }

    /**
     * Update the deprecation warning display
     */
    function updateDeprecationWarning(version) {
        var warningEl = document.getElementById('versionDeprecationWarning');
        if (!warningEl || !versionsData) return;

        var versionInfo = versionsData.versions.find(function(v) {
            return v.version === version;
        });

        if (!versionInfo) return;

        if (versionInfo.deprecated) {
            var message = '⚠ This version is deprecated';
            
            if (versionInfo.sunset) {
                message += ' and will be sunset on ' + versionInfo.sunset;
            }
            
            if (versionInfo.successor) {
                message += '. Please migrate to v' + versionInfo.successor;
            }
            
            warningEl.textContent = message;
            warningEl.style.display = 'inline';
            
            // Add link to migration docs if available
            if (versionInfo.doc_url) {
                var link = document.createElement('a');
                link.href = versionInfo.doc_url;
                link.textContent = ' Learn more';
                link.target = '_blank';
                link.style.color = '#d9534f';
                link.style.textDecoration = 'underline';
                link.style.marginLeft = '5px';
                warningEl.appendChild(link);
            }
        } else {
            warningEl.style.display = 'none';
            warningEl.textContent = '';
        }
    }

    /**
     * Regenerate the API menu based on the loaded swagger specification
     */
    function regenerateMenu(spec) {
        // Delegate to the global buildDynamicSidebarMenu which reads the spec
        // directly from Swagger UI and handles insertion/cleanup
        if (window.buildDynamicSidebarMenu && typeof window.buildDynamicSidebarMenu === 'function') {
            window.buildDynamicSidebarMenu();
        } else {
            console.warn('buildDynamicSidebarMenu not available');
        }

        // Re-initialize sidebar navigation to bind events to new menu items
        if (window.initializeSidebarNavigation && typeof window.initializeSidebarNavigation === 'function') {
            window.initializeSidebarNavigation();
        }

        // Re-apply any active search filter to the new menu
        var searchInput = document.getElementById('SearchDocInput');
        if (searchInput && searchInput.value) {
            filterMenuBySearch(searchInput.value.toLowerCase().trim());
        }
    }
    
    /**
     * Filter menu items based on search query
     */
    function filterMenuBySearch(query) {
        var menuContainer = document.querySelector('.api-sidebar ul');
        if (!menuContainer) return;
        
        // Get all menu items with data-tag (API sections)
        var menuItems = menuContainer.querySelectorAll('li');
        
        menuItems.forEach(function(li) {
            var parentLink = li.querySelector('.parent-link');
            if (!parentLink || !parentLink.hasAttribute('data-tag')) {
                // This is a static section or other item - don't filter it
                return;
            }
            
            if (!query) {
                // No search query - show everything
                li.style.display = '';
                var submenu = li.querySelector('ul');
                if (submenu) {
                    var childLinks = submenu.querySelectorAll('li');
                    childLinks.forEach(function(child) {
                        child.style.display = '';
                    });
                }
                return;
            }
            
            // Check if tag name matches
            var tagName = parentLink.textContent.toLowerCase();
            var tagMatches = tagName.includes(query);
            
            // Check if any child operation matches
            var submenu = li.querySelector('ul');
            var anyChildMatches = false;
            
            if (submenu) {
                var childLinks = submenu.querySelectorAll('li a');
                childLinks.forEach(function(childLink) {
                    var operationName = childLink.textContent.toLowerCase();
                    var matchesQuery = operationName.includes(query);
                    
                    if (matchesQuery || tagMatches) {
                        childLink.parentElement.style.display = '';
                        anyChildMatches = true;
                    } else {
                        childLink.parentElement.style.display = 'none';
                    }
                });
            }
            
            // Show parent if tag matches or any child matches
            if (tagMatches || anyChildMatches) {
                li.style.display = '';
                // Expand submenu if search matches
                if (submenu && submenu.classList.contains('collapsed')) {
                    submenu.classList.remove('collapsed');
                }
            } else {
                li.style.display = 'none';
            }
        });
    }
    
    /**
     * Get version from URL parameter if present
     */
    function getVersionFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return params.get('version');
    }

    /**
     * Initialize version management system
     */
    function initializeVersionManagement() {
        // Load versions manifest and populate selector
        loadVersionsManifest().then(function(data) {
            if (data) {
                populateVersionSelector();
                console.log('Version management initialized with', data.versions.length, 'versions');
            } else {
                console.log('No version manifest found - running in single-version mode');
                // Hide version selector if no manifest
                var versionSelector = document.querySelector('.version-selector');
                if (versionSelector) {
                    versionSelector.style.display = 'none';
                }
            }
        });
    }

    // Public API
    window.FigshareVersionManager = {
        initialize: initializeVersionManagement,
        getCurrentVersion: function() { return currentVersion; },
        getVersionsData: function() { return versionsData; },
        filterMenuBySearch: filterMenuBySearch,
        regenerateMenu: regenerateMenu
    };

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeVersionManagement);
    } else {
        initializeVersionManagement();
    }

})();
