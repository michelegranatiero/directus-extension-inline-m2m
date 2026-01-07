# Directus Inline M2M Interface

A powerful inline interface for Directus that allows editing of Many-to-Many (M2M) relationships directly within their parent's form. Features accordion-style cards, drag-and-drop sorting, and comprehensive CRUD operations.

[![npm version](https://img.shields.io/npm/v/directus-extension-inline-m2m.svg)](https://www.npmjs.com/package/directus-extension-inline-m2m)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)


## Features

- ✅ **Many-to-Many (M2M) Support** with accordion-style cards
- ✅ **Drag-and-drop reordering** (when sortField is defined)
- ✅ **Nested forms support** for complex relationships
- ✅ **Item limit** with "Show more" functionality
- ✅ **Status indicators** (New, Modified, Deleted)
- ✅ **Undo delete** for existing items
- ✅ **Create new items** or **link existing items** from related collection
- ✅ **Full CRUD operations** on junction and related items
- ✅ **Permission-aware** - respects Directus roles and permissions

![Screenshot of the interface (dark)](https://raw.githubusercontent.com/michelegranatiero/directus-extension-inline-m2m/main/docs/screenshot-dark.png)

## Installation

### Via npm

```bash
npm install directus-extension-inline-m2m
```

## Usage

1. In your Directus Data Model, create or edit a **Many-to-Many (M2M)** field
2. In the **Interface** section, select **Inline M2M**
3. Configure the options (see below)
4. Save and start editing related items inline!

## Options

### `Enable Create`
Allows users to create new items in the related collection directly from the parent form.

### `Enable Select`
Allows users to link existing items from the related collection.

### `Template`
Customize how items are displayed in the accordion header using Directus template syntax (e.g., `{{title}} - {{status}}`).

### `Limit`
Number of items to display initially. Additional items can be revealed with "Show more" button.

### `Allow Duplicates`
Allow linking the same related item multiple times.

### `Filter`
Filter which items can be selected when linking existing items.

## Screenshots

![Screenshot of the interface (light)](https://raw.githubusercontent.com/michelegranatiero/directus-extension-inline-m2m/main/docs/screenshot-light.png)


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

- Inspired by [directus-extension-inline-form-interface](https://github.com/hanneskuettner/directus-extension-inline-form-interface) by **Hannes Küttner** and the UI/UX approach of [directus-expandable-blocks](https://github.com/smartlabsAT/directus-expandable-blocks) by **smartlabsAT**.

