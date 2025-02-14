<script>
  import {
    Input,
    Button,
    Label,
    TextButton,
    Select,
    Toggle,
    Radio,
  } from "@budibase/bbui"
  import { cloneDeep } from "lodash/fp"
  import { backendUiStore } from "builderStore"
  import { TableNames, UNEDITABLE_USER_FIELDS } from "constants"
  import { FIELDS, AUTO_COLUMN_SUB_TYPES } from "constants/backend"
  import { getAutoColumnInformation, buildAutoColumn } from "builderStore/utils"
  import { notifier } from "builderStore/store/notifications"
  import ValuesList from "components/common/ValuesList.svelte"
  import DatePicker from "components/common/DatePicker.svelte"
  import ConfirmDialog from "components/common/ConfirmDialog.svelte"

  const AUTO_COL = "auto"
  const LINK_TYPE = FIELDS.LINK.type
  let fieldDefinitions = cloneDeep(FIELDS)

  export let onClosed
  export let field = {
    type: "string",
    constraints: fieldDefinitions.STRING.constraints,

    // Initial value for column name in other table for linked records
    fieldName: $backendUiStore.selectedTable.name,
  }

  let originalName = field.name
  let primaryDisplay =
    $backendUiStore.selectedTable.primaryDisplay == null ||
    $backendUiStore.selectedTable.primaryDisplay === field.name

  let relationshipTypes = [
    { text: "Many to many (N:N)", value: "many-to-many" },
    { text: "One to many (1:N)", value: "one-to-many" },
  ]
  let types = ["Many to many (N:N)", "One to many (1:N)"]

  let selectedRelationshipType =
    relationshipTypes.find(type => type.value === field.relationshipType)
      ?.text || "Many to many (N:N)"

  let indexes = [...($backendUiStore.selectedTable.indexes || [])]
  let confirmDeleteDialog
  let deletion

  $: tableOptions = $backendUiStore.tables.filter(
    table => table._id !== $backendUiStore.draftTable._id
  )
  $: required = !!field?.constraints?.presence || primaryDisplay
  $: uneditable =
    $backendUiStore.selectedTable?._id === TableNames.USERS &&
    UNEDITABLE_USER_FIELDS.includes(field.name)
  $: invalid = field.type === FIELDS.LINK.type && !field.tableId

  // used to select what different options can be displayed for column type
  $: canBeSearched =
    field.type !== LINK_TYPE &&
    field.subtype !== AUTO_COLUMN_SUB_TYPES.CREATED_BY &&
    field.subtype !== AUTO_COLUMN_SUB_TYPES.UPDATED_BY
  $: canBeDisplay = field.type !== LINK_TYPE && field.type !== AUTO_COL
  $: canBeRequired =
    field.type !== LINK_TYPE && !uneditable && field.type !== AUTO_COL

  async function saveColumn() {
    // Set relationship type if it's
    if (field.type === "link") {
      field.relationshipType = relationshipTypes.find(
        type => type.text === selectedRelationshipType
      ).value
    }

    if (field.type === AUTO_COL) {
      field = buildAutoColumn(
        $backendUiStore.draftTable.name,
        field.name,
        field.subtype
      )
    }
    backendUiStore.update(state => {
      backendUiStore.actions.tables.saveField({
        originalName,
        field,
        primaryDisplay,
        indexes,
      })
      return state
    })
    onClosed()
  }

  function deleteColumn() {
    if (field.name === $backendUiStore.selectedTable.primaryDisplay) {
      notifier.danger("You cannot delete the display column")
    } else {
      backendUiStore.actions.tables.deleteField(field)
      notifier.success(`Column ${field.name} deleted.`)
      onClosed()
    }
  }

  function handleTypeChange(event) {
    const definition = fieldDefinitions[event.target.value.toUpperCase()]
    if (!definition) {
      return
    }
    field.type = definition.type
    field.constraints = definition.constraints
    // remove any extra fields that may not be related to this type
    delete field.autocolumn
    delete field.subtype
    delete field.tableId
  }

  function onChangeRequired(e) {
    const req = e.target.checked
    field.constraints.presence = req ? { allowEmpty: false } : false
    required = req
  }

  function onChangePrimaryDisplay(e) {
    const isPrimary = e.target.checked
    // primary display is always required
    if (isPrimary) {
      field.constraints.presence = { allowEmpty: false }
    }
  }

  function onChangePrimaryIndex(e) {
    indexes = e.target.checked ? [field.name] : []
  }

  function onChangeSecondaryIndex(e) {
    if (e.target.checked) {
      indexes[1] = field.name
    } else {
      indexes = indexes.slice(0, 1)
    }
  }

  function confirmDelete() {
    confirmDeleteDialog.show()
    deletion = true
  }

  function hideDeleteDialog() {
    confirmDeleteDialog.hide()
    deletion = false
  }
</script>

<div class="actions" class:hidden={deletion}>
  <Input label="Name" thin bind:value={field.name} disabled={uneditable} />

  <Select
    disabled={originalName}
    secondary
    thin
    label="Type"
    on:change={handleTypeChange}
    bind:value={field.type}>
    {#each Object.values(fieldDefinitions) as field}
      <option value={field.type}>{field.name}</option>
    {/each}
    <option value={AUTO_COL}>Auto Column</option>
  </Select>

  {#if canBeRequired}
    <Toggle
      checked={required}
      on:change={onChangeRequired}
      disabled={primaryDisplay}
      thin
      text="Required" />
  {/if}

  {#if canBeDisplay}
    <Toggle
      bind:checked={primaryDisplay}
      on:change={onChangePrimaryDisplay}
      thin
      text="Use as table display column" />

    <Label grey small>Search Indexes</Label>
  {/if}
  {#if canBeSearched}
    <Toggle
      checked={indexes[0] === field.name}
      disabled={indexes[1] === field.name}
      on:change={onChangePrimaryIndex}
      thin
      text="Primary" />
    <Toggle
      checked={indexes[1] === field.name}
      disabled={!indexes[0] || indexes[0] === field.name}
      on:change={onChangeSecondaryIndex}
      thin
      text="Secondary" />
  {/if}

  {#if field.type === 'string'}
    <Input
      thin
      type="number"
      label="Max Length"
      bind:value={field.constraints.length.maximum} />
  {:else if field.type === 'options'}
    <ValuesList
      label="Options (one per line)"
      bind:values={field.constraints.inclusion} />
  {:else if field.type === 'datetime'}
    <DatePicker
      label="Earliest"
      bind:value={field.constraints.datetime.earliest} />
    <DatePicker label="Latest" bind:value={field.constraints.datetime.latest} />
  {:else if field.type === 'number'}
    <Input
      thin
      type="number"
      label="Min Value"
      bind:value={field.constraints.numericality.greaterThanOrEqualTo} />
    <Input
      thin
      type="number"
      label="Max Value"
      bind:value={field.constraints.numericality.lessThanOrEqualTo} />
  {:else if field.type === 'link'}
    <div>
      <Label grey extraSmall>Select relationship type</Label>
      <div class="radio-buttons">
        {#each types as type}
          <Radio
            disabled={originalName}
            name="Relationship type"
            value={type}
            bind:group={selectedRelationshipType}>
            <label for={type}>{type}</label>
          </Radio>
        {/each}
      </div>
    </div>
    <Select label="Table" thin secondary bind:value={field.tableId}>
      <option value="">Choose an option</option>
      {#each tableOptions as table}
        <option value={table._id}>{table.name}</option>
      {/each}
    </Select>
    <Input
      label={`Column Name in Other Table`}
      thin
      bind:value={field.fieldName} />
  {:else if field.type === AUTO_COL}
    <Select label="Auto Column Type" thin secondary bind:value={field.subtype}>
      <option value="">Choose a subtype</option>
      {#each Object.entries(getAutoColumnInformation()) as [subtype, info]}
        <option value={subtype}>{info.name}</option>
      {/each}
    </Select>
  {/if}
  <footer class="create-column-options">
    {#if !uneditable && originalName != null}
      <TextButton text on:click={confirmDelete}>Delete Column</TextButton>
    {/if}
    <Button secondary on:click={onClosed}>Cancel</Button>
    <Button primary on:click={saveColumn} bind:disabled={invalid}>
      Save Column
    </Button>
  </footer>
</div>
<ConfirmDialog
  bind:this={confirmDeleteDialog}
  body={`Are you sure you wish to delete this column? Your data will be deleted and this action cannot be undone.`}
  okText="Delete Column"
  onOk={deleteColumn}
  onCancel={hideDeleteDialog}
  title="Confirm Deletion" />

<style>
  label {
    display: grid;
    place-items: center;
  }
  .radio-buttons {
    display: flex;
    gap: var(--spacing-m);
    font-size: var(--font-size-xs);
  }
  .actions {
    display: grid;
    grid-gap: var(--spacing-xl);
    min-width: 400px;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-m);
  }

  :global(.create-column-options button:first-child) {
    margin-right: auto;
  }

  .hidden {
    display: none;
  }
</style>
