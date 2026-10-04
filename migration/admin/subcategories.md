# Subcategories

Use **Subcategories** in the Catalog section to organize products under a parent category.

- Search by subcategory name or parent category name. Use **All** or a category chip to filter the list; the filter chips include inactive categories.
- Select **Add subcategory**, enter a subcategory name, choose a parent category, and select **Create subcategory**. The parent picker lists active categories only.
- To edit, select the edit icon on a row. Change the name or parent category and choose **Save changes**.
- Select the product count to see products linked to that subcategory.
- To delete, select the trash icon and confirm with the admin contact number and passcode. Deletion removes the subcategory and every product matched to it. Check the confirmation message for the number of products removed.

## CSV import, export, and template

- Select the document icon to download `subcategories-template.csv`. It contains the columns `name` and `category`.
- Fill one row per subcategory. For example:

	```csv
	name,category
	Cement,Building Materials
	```

- Select the upload icon, choose the completed CSV file, and wait for the import message. The category must match an existing category. Rows missing a name or category are ignored. A duplicate subcategory or an invalid category causes the API validation to reject the import; the screen shows the API error message.
- After a successful import, the list refreshes automatically. The message reports how many rows were added and skipped.
- Select the download icon to export the full subcategory list as `subcategories.csv`, with the same `name` and `category` columns.
