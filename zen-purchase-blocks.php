<?php
/**
 * Plugin Name: Zen Purchase Blocks
 * Description: Dynamic purchase blocks for memberships, packages, drop-ins, and future gift-card offers.
 * Version: 0.3.7
 * Author: Custom
 * Text Domain: zen-purchase-blocks
 *
 * @package ZenPurchaseBlocks
 */

defined( 'ABSPATH' ) || exit;

define( 'ZPB_VERSION', '0.3.7' );
define( 'ZPB_PLUGIN_FILE', __FILE__ );
define( 'ZPB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'ZPB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once ZPB_PLUGIN_DIR . 'includes/class-zen-purchase-blocks.php';

ZPB_Zen_Purchase_Blocks::init();
