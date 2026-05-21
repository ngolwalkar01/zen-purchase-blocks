( function ( blocks, blockEditor, components, element, i18n, apiFetch, serverSideRender ) {
	var el = element.createElement;
	var __ = i18n.__;
	var registerBlockType = blocks.registerBlockType;
	var useBlockProps = blockEditor.useBlockProps;
	var InspectorControls = blockEditor.InspectorControls;
	var PanelBody = components.PanelBody;
	var SelectControl = components.SelectControl;
	var TextControl = components.TextControl;
	var TextareaControl = components.TextareaControl;
	var ToggleControl = components.ToggleControl;
	var Button = components.Button;
	var Spinner = components.Spinner;
	var Notice = components.Notice;
	var ServerSideRender = serverSideRender;

	function itemKey( productId, variationId ) {
		return parseInt( productId || 0, 10 ) + ':' + parseInt( variationId || 0, 10 );
	}

	function normalizeLabels( labels ) {
		return Object.assign(
			{
				monthly: 'Monthly',
				yearly: 'Yearly',
				button: 'Become Member',
				zencoins: 'ZENCOINS:',
				moreInfo: 'more information'
			},
			labels || {}
		);
	}

	function splitBenefits( value ) {
		return String( value || '' )
			.split( '\n' )
			.map( function ( line ) {
				return line.trim();
			} )
			.filter( Boolean );
	}

	function Edit( props ) {
		var attributes = props.attributes;
		var setAttributes = props.setAttributes;
		var blockProps = useBlockProps( { className: 'zpb-membership-plans-editor' } );
		var useState = element.useState;
		var useEffect = element.useEffect;
		var plansState = useState( [] );
		var plans = plansState[ 0 ];
		var setPlans = plansState[ 1 ];
		var productsState = useState( [] );
		var products = productsState[ 0 ];
		var setProducts = productsState[ 1 ];
		var loadingState = useState( false );
		var loading = loadingState[ 0 ];
		var setLoading = loadingState[ 1 ];
		var errorState = useState( '' );
		var error = errorState[ 0 ];
		var setError = errorState[ 1 ];
		var labels = normalizeLabels( attributes.labels );
		var selectedItems = Array.isArray( attributes.selectedItems ) ? attributes.selectedItems : [];
		var selectedPlanIds = Array.isArray( attributes.membershipPlanIds ) && attributes.membershipPlanIds.length
			? attributes.membershipPlanIds.map( function ( id ) {
				return parseInt( id || 0, 10 );
			} ).filter( Boolean )
			: ( attributes.membershipPlanId ? [ parseInt( attributes.membershipPlanId || 0, 10 ) ] : [] );
		var selectedByKey = {};

		selectedItems.forEach( function ( item ) {
			selectedByKey[ itemKey( item.productId, item.variationId ) ] = item;
		} );

		useEffect( function () {
			apiFetch( { path: '/zen-purchase-blocks/v1/membership-plans' } )
				.then( function ( response ) {
					setPlans( response || [] );
				} )
				.catch( function () {
					setError( __( 'Could not load membership plans.', 'zen-purchase-blocks' ) );
				} );
		}, [] );

		useEffect( function () {
			if ( selectedPlanIds.length === 0 ) {
				setProducts( [] );
				return;
			}

			setLoading( true );
			setError( '' );

			apiFetch( { path: '/zen-purchase-blocks/v1/membership-plan-products?ids=' + encodeURIComponent( selectedPlanIds.join( ',' ) ) } )
				.then( function ( response ) {
					var nextProducts = response || [];
					var availableKeys = {};

					nextProducts.forEach( function ( product ) {
						availableKeys[ itemKey( product.productId, product.variationId ) ] = true;
					} );

					setProducts( nextProducts );

					if ( selectedItems.some( function ( item ) {
						return ! availableKeys[ itemKey( item.productId, item.variationId ) ];
					} ) ) {
						setAttributes( {
							selectedItems: selectedItems.filter( function ( item ) {
								return availableKeys[ itemKey( item.productId, item.variationId ) ];
							} )
						} );
					}

					setLoading( false );
				} )
				.catch( function () {
					setError( __( 'Could not load products for this membership plan.', 'zen-purchase-blocks' ) );
					setLoading( false );
				} );
		}, [ selectedPlanIds.join( ',' ) ] );

		function togglePlan( planId, checked ) {
			var id = parseInt( planId || 0, 10 );
			var next = selectedPlanIds.filter( function ( existingId ) {
				return existingId !== id;
			} );

			if ( checked && id ) {
				next.push( id );
			}

			setAttributes( {
				membershipPlanId: next.length ? next[ 0 ] : 0,
				membershipPlanIds: next
			} );
		}

		function updateLabels( key, value ) {
			var next = Object.assign( {}, labels );
			next[ key ] = value;
			setAttributes( { labels: next } );
		}

		function updateItem( key, patch ) {
			var next = selectedItems.map( function ( item ) {
				if ( itemKey( item.productId, item.variationId ) !== key ) {
					return item;
				}

				return Object.assign( {}, item, patch );
			} );

			setAttributes( { selectedItems: next } );
		}

		function toggleProduct( product, checked ) {
			var key = itemKey( product.productId, product.variationId );
			var next;

			if ( checked ) {
				if ( selectedByKey[ key ] ) {
					return;
				}

				next = selectedItems.concat( [
					{
						productId: product.productId,
						variationId: product.variationId || 0,
						billingGroup: 'monthly',
						featured: false,
						badgeText: '',
						titleOverride: '',
						subtitleOverride: '',
						monthlyPriceOverride: '',
						benefits: [],
						moreInfo: ''
					}
				] );
			} else {
				next = selectedItems.filter( function ( item ) {
					return itemKey( item.productId, item.variationId ) !== key;
				} );
			}

			setAttributes( { selectedItems: next } );
		}

		return el(
			'div',
			blockProps,
			el(
				InspectorControls,
				null,
				el(
					PanelBody,
					{ title: __( 'Membership Source', 'zen-purchase-blocks' ), initialOpen: true },
					plans.length
						? plans.map( function ( plan ) {
							return el( ToggleControl, {
								key: plan.id,
								label: plan.name,
								checked: selectedPlanIds.indexOf( parseInt( plan.id || 0, 10 ) ) !== -1,
								onChange: function ( checked ) {
									togglePlan( plan.id, checked );
								}
							} );
						} )
						: el( 'p', null, __( 'No membership plans found.', 'zen-purchase-blocks' ) ),
					loading ? el( Spinner ) : null,
					error ? el( Notice, { status: 'error', isDismissible: false }, error ) : null
				),
				el(
					PanelBody,
					{ title: __( 'Section Copy', 'zen-purchase-blocks' ), initialOpen: false },
					el( TextControl, {
						label: __( 'Heading', 'zen-purchase-blocks' ),
						value: attributes.heading || '',
						onChange: function ( value ) {
							setAttributes( { heading: value } );
						}
					} ),
					el( TextareaControl, {
						label: __( 'Intro', 'zen-purchase-blocks' ),
						value: attributes.intro || '',
						onChange: function ( value ) {
							setAttributes( { intro: value } );
						}
					} ),
					el( TextControl, {
						label: __( 'Monthly tab label', 'zen-purchase-blocks' ),
						value: labels.monthly,
						onChange: function ( value ) {
							updateLabels( 'monthly', value );
						}
					} ),
					el( TextControl, {
						label: __( 'Yearly tab label', 'zen-purchase-blocks' ),
						value: labels.yearly,
						onChange: function ( value ) {
							updateLabels( 'yearly', value );
						}
					} ),
					el( TextControl, {
						label: __( 'Button label', 'zen-purchase-blocks' ),
						value: labels.button,
						onChange: function ( value ) {
							updateLabels( 'button', value );
						}
					} )
				),
				el(
					PanelBody,
					{ title: __( 'Products To Show', 'zen-purchase-blocks' ), initialOpen: true },
					selectedPlanIds.length === 0
						? el( 'p', null, __( 'Choose one or more membership plans first.', 'zen-purchase-blocks' ) )
						: null,
					selectedPlanIds.length > 0 && ! loading && products.length === 0
						? el( 'p', null, __( 'No assigned products or variations were found for the selected plans.', 'zen-purchase-blocks' ) )
						: null,
					products.map( function ( product ) {
						var key = itemKey( product.productId, product.variationId );
						var item = selectedByKey[ key ];

						return el(
							'div',
							{ className: 'zpb-editor-product', key: key },
							el( ToggleControl, {
								label: product.name,
								help: product.priceText + ( product.monthlyEquivalentText ? ' | Monthly equivalent: ' + product.monthlyEquivalentText : '' ) + ( product.zencoinValueText ? ' | ' + product.zencoinValueText + ' ZC' : '' ),
								checked: !! item,
								onChange: function ( checked ) {
									toggleProduct( product, checked );
								}
							} ),
							item
								? el(
									'div',
									{ className: 'zpb-editor-product__settings' },
									el( SelectControl, {
										label: __( 'Billing tab', 'zen-purchase-blocks' ),
										value: item.billingGroup || 'monthly',
										options: [
											{ label: labels.monthly, value: 'monthly' },
											{ label: labels.yearly, value: 'yearly' }
										],
										onChange: function ( value ) {
											updateItem( key, { billingGroup: value } );
										}
									} ),
									( item.billingGroup || 'monthly' ) === 'yearly'
										? el( TextControl, {
											label: __( 'Monthly display price override', 'zen-purchase-blocks' ),
											value: item.monthlyPriceOverride || '',
											placeholder: product.monthlyEquivalentText || '',
											help: product.monthlyEquivalentText
												? __( 'Leave empty to use the calculated yearly price divided by 12.', 'zen-purchase-blocks' )
												: __( 'Leave empty to use the calculated value when available.', 'zen-purchase-blocks' ),
											onChange: function ( value ) {
												updateItem( key, { monthlyPriceOverride: value } );
											}
										} )
										: null,
									el( ToggleControl, {
										label: __( 'Featured gold card', 'zen-purchase-blocks' ),
										checked: !! item.featured,
										onChange: function ( checked ) {
											updateItem( key, { featured: checked } );
										}
									} ),
									el( TextControl, {
										label: __( 'Savings badge', 'zen-purchase-blocks' ),
										value: item.badgeText || '',
										placeholder: __( 'Save 108 EUR per year', 'zen-purchase-blocks' ),
										onChange: function ( value ) {
											updateItem( key, { badgeText: value } );
										}
									} ),
									el( TextControl, {
										label: __( 'Title override', 'zen-purchase-blocks' ),
										value: item.titleOverride || '',
										placeholder: product.name,
										onChange: function ( value ) {
											updateItem( key, { titleOverride: value } );
										}
									} ),
									el( TextControl, {
										label: __( 'Subtitle override', 'zen-purchase-blocks' ),
										value: item.subtitleOverride || '',
										placeholder: __( 'MASTER', 'zen-purchase-blocks' ),
										onChange: function ( value ) {
											updateItem( key, { subtitleOverride: value } );
										}
									} ),
									el( TextareaControl, {
										label: __( 'Benefits, one per line', 'zen-purchase-blocks' ),
										value: Array.isArray( item.benefits ) ? item.benefits.join( '\n' ) : '',
										onChange: function ( value ) {
											updateItem( key, { benefits: splitBenefits( value ) } );
										}
									} ),
									el( TextareaControl, {
										label: __( 'More information', 'zen-purchase-blocks' ),
										value: item.moreInfo || '',
										onChange: function ( value ) {
											updateItem( key, { moreInfo: value } );
										}
									} )
								)
								: null
						);
					} )
				)
			),
			el(
				'div',
				{ className: 'zpb-editor-preview' },
				el( ServerSideRender, {
					block: 'zen-purchase-blocks/membership-plans',
					attributes: attributes
				} )
			)
		);
	}

	registerBlockType( 'zen-purchase-blocks/membership-plans', {
		edit: Edit,
		save: function () {
			return null;
		}
	} );
} )(
	window.wp.blocks,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.element,
	window.wp.i18n,
	window.wp.apiFetch,
	window.wp.serverSideRender
);
