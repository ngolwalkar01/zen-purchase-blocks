( function ( blocks, blockEditor, components, element, i18n, apiFetch, serverSideRender ) {
	var el = element.createElement;
	var __ = i18n.__;
	var registerBlockType = blocks.registerBlockType;
	var useBlockProps = blockEditor.useBlockProps;
	var InspectorControls = blockEditor.InspectorControls;
	var PanelBody = components.PanelBody;
	var TextControl = components.TextControl;
	var TextareaControl = components.TextareaControl;
	var ToggleControl = components.ToggleControl;
	var Spinner = components.Spinner;
	var Notice = components.Notice;
	var ServerSideRender = serverSideRender;

	function normalizeLabels( labels ) {
		return Object.assign(
			{
				zencoins: 'ZENCOINS:',
				usageText: 'For all Courses and Fire & Ice Zone',
				validityText: 'Valid for 3 Months beginning with the date of purchase',
				freeNote: '*Only one use',
				button: 'Book now'
			},
			labels || {}
		);
	}

	function Edit( props ) {
		var attributes = props.attributes;
		var setAttributes = props.setAttributes;
		var blockProps = useBlockProps( { className: 'zpb-dropins-editor' } );
		var useState = element.useState;
		var useEffect = element.useEffect;
		var productsState = useState( [] );
		var products = productsState[ 0 ];
		var setProducts = productsState[ 1 ];
		var loadingState = useState( true );
		var loading = loadingState[ 0 ];
		var setLoading = loadingState[ 1 ];
		var errorState = useState( '' );
		var error = errorState[ 0 ];
		var setError = errorState[ 1 ];
		var labels = normalizeLabels( attributes.labels );
		var selectedItems = Array.isArray( attributes.selectedItems ) ? attributes.selectedItems : [];
		var selectedById = {};

		selectedItems.forEach( function ( item ) {
			selectedById[ parseInt( item.productId || 0, 10 ) ] = item;
		} );

		useEffect( function () {
			apiFetch( { path: '/zen-purchase-blocks/v1/drop-in-products' } )
				.then( function ( response ) {
					setProducts( response || [] );
					setLoading( false );
				} )
				.catch( function () {
					setError( __( 'Could not load Zencoin drop-in products.', 'zen-purchase-blocks' ) );
					setLoading( false );
				} );
		}, [] );

		function updateLabels( key, value ) {
			var next = Object.assign( {}, labels );
			next[ key ] = value;
			setAttributes( { labels: next } );
		}

		function updateItem( productId, patch ) {
			var id = parseInt( productId || 0, 10 );
			setAttributes( {
				selectedItems: selectedItems.map( function ( item ) {
					return parseInt( item.productId || 0, 10 ) === id ? Object.assign( {}, item, patch ) : item;
				} )
			} );
		}

		function toggleProduct( product, checked ) {
			var id = parseInt( product.productId || 0, 10 );
			var next;

			if ( checked ) {
				if ( selectedById[ id ] ) {
					return;
				}

				next = selectedItems.concat( [
					{
						productId: id,
						zencoinOverride: '',
						priceOverride: '',
						imageUrlOverride: '',
						usageText: '',
						validityText: '',
						noteText: '',
						buttonLabel: ''
					}
				] );
			} else {
				next = selectedItems.filter( function ( item ) {
					return parseInt( item.productId || 0, 10 ) !== id;
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
					{ title: __( 'Section Copy', 'zen-purchase-blocks' ), initialOpen: true },
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
						label: __( 'Zencoins label', 'zen-purchase-blocks' ),
						value: labels.zencoins,
						onChange: function ( value ) {
							updateLabels( 'zencoins', value );
						}
					} ),
					el( TextControl, {
						label: __( 'Default usage text', 'zen-purchase-blocks' ),
						value: labels.usageText,
						onChange: function ( value ) {
							updateLabels( 'usageText', value );
						}
					} ),
					el( TextControl, {
						label: __( 'Default free note', 'zen-purchase-blocks' ),
						value: labels.freeNote,
						onChange: function ( value ) {
							updateLabels( 'freeNote', value );
						}
					} ),
					el( TextControl, {
						label: __( 'Default button label', 'zen-purchase-blocks' ),
						value: labels.button,
						onChange: function ( value ) {
							updateLabels( 'button', value );
						}
					} )
				),
				el(
					PanelBody,
					{ title: __( 'Drop-in Products', 'zen-purchase-blocks' ), initialOpen: true },
					loading ? el( Spinner ) : null,
					error ? el( Notice, { status: 'error', isDismissible: false }, error ) : null,
					! loading && products.length === 0
						? el( 'p', null, __( 'No products with Zencoin product type Drop-in or Free drop-in trial were found.', 'zen-purchase-blocks' ) )
						: null,
					products.map( function ( product ) {
						var item = selectedById[ parseInt( product.productId || 0, 10 ) ];

						return el(
							'div',
							{ className: 'zpb-editor-product', key: product.productId },
							el( ToggleControl, {
								label: product.name,
								help: product.priceText + ( product.zencoinValueText ? ' | ' + product.zencoinValueText + ' ZC' : '' ) + ( product.productType ? ' | ' + product.productType : '' ),
								checked: !! item,
								onChange: function ( checked ) {
									toggleProduct( product, checked );
								}
							} ),
							item
								? el(
									'div',
									{ className: 'zpb-editor-product__settings' },
									el( TextControl, {
										label: __( 'Image URL override', 'zen-purchase-blocks' ),
										value: item.imageUrlOverride || '',
										placeholder: product.imageUrl || '',
										onChange: function ( value ) {
											updateItem( product.productId, { imageUrlOverride: value } );
										}
									} ),
									el( TextControl, {
										label: __( 'Price display override', 'zen-purchase-blocks' ),
										value: item.priceOverride || '',
										placeholder: product.priceText || '',
										onChange: function ( value ) {
											updateItem( product.productId, { priceOverride: value } );
										}
									} ),
									el( TextControl, {
										label: __( 'Zencoin display override', 'zen-purchase-blocks' ),
										value: item.zencoinOverride || '',
										placeholder: product.zencoinValueText || '',
										onChange: function ( value ) {
											updateItem( product.productId, { zencoinOverride: value } );
										}
									} ),
									el( TextControl, {
										label: __( 'Usage text override', 'zen-purchase-blocks' ),
										value: item.usageText || '',
										placeholder: labels.usageText,
										onChange: function ( value ) {
											updateItem( product.productId, { usageText: value } );
										}
									} ),
									el( TextareaControl, {
										label: __( 'Validity text override', 'zen-purchase-blocks' ),
										value: item.validityText || '',
										placeholder: product.validityDays ? __( 'Leave empty to use product validity months.', 'zen-purchase-blocks' ) : labels.validityText,
										onChange: function ( value ) {
											updateItem( product.productId, { validityText: value } );
										}
									} ),
									el( TextControl, {
										label: __( 'Note text override', 'zen-purchase-blocks' ),
										value: item.noteText || '',
										placeholder: product.productType === 'free_drop_in' ? labels.freeNote : '',
										onChange: function ( value ) {
											updateItem( product.productId, { noteText: value } );
										}
									} ),
									el( TextControl, {
										label: __( 'Button label override', 'zen-purchase-blocks' ),
										value: item.buttonLabel || '',
										placeholder: labels.button,
										onChange: function ( value ) {
											updateItem( product.productId, { buttonLabel: value } );
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
					block: 'zen-purchase-blocks/drop-ins',
					attributes: attributes
				} )
			)
		);
	}

	registerBlockType( 'zen-purchase-blocks/drop-ins', {
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
