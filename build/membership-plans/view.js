( function () {
	function activateTab( section, target ) {
		var tabs = section.querySelectorAll( '[data-zpb-tab]' );
		var panels = section.querySelectorAll( '[data-zpb-panel]' );

		tabs.forEach( function ( tab ) {
			var active = tab.getAttribute( 'data-zpb-tab' ) === target;
			tab.classList.toggle( 'is-active', active );
			tab.setAttribute( 'aria-selected', active ? 'true' : 'false' );
		} );

		panels.forEach( function ( panel ) {
			panel.classList.toggle( 'is-active', panel.getAttribute( 'data-zpb-panel' ) === target );
		} );
	}

	document.addEventListener( 'click', function ( event ) {
		var tab = event.target.closest( '[data-zpb-tab]' );

		if ( ! tab ) {
			return;
		}

		var section = tab.closest( '.zpb-membership-plans' );

		if ( section ) {
			activateTab( section, tab.getAttribute( 'data-zpb-tab' ) );
		}
	} );
} )();
