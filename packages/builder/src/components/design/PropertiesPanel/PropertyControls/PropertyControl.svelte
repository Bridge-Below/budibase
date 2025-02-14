<script>
  import { Button, Icon, Drawer, Body } from "@budibase/bbui"
  import { store, currentAsset } from "builderStore"
  import {
    getBindableProperties,
    readableToRuntimeBinding,
    runtimeToReadableBinding,
  } from "builderStore/dataBinding"
  import BindingPanel from "components/design/PropertiesPanel/BindingPanel.svelte"
  import { capitalise } from "../../../../helpers"

  export let label = ""
  export let bindable = true
  export let componentInstance = {}
  export let control = null
  export let key = ""
  export let type = ""
  export let value = null
  export let props = {}
  export let onChange = () => {}

  let bindingDrawer
  let temporaryBindableValue = value
  let anchor
  let valid

  $: bindableProperties = getBindableProperties(
    $currentAsset,
    $store.selectedComponentId
  )
  $: safeValue = getSafeValue(value, props.defaultValue, bindableProperties)
  $: replaceBindings = val => readableToRuntimeBinding(bindableProperties, val)

  const handleClose = () => {
    handleChange(temporaryBindableValue)
    bindingDrawer.hide()
  }

  // Handle a value change of any type
  // String values have any bindings handled
  const handleChange = value => {
    let innerVal = value
    if (value && typeof value === "object") {
      if ("detail" in value) {
        innerVal = value.detail
      } else if ("target" in value) {
        innerVal = value.target.value
      }
    }

    if (type === "number") {
      innerVal = parseInt(innerVal)
    }

    if (typeof innerVal === "string") {
      onChange(replaceBindings(innerVal))
    } else {
      onChange(innerVal)
    }
  }

  // The "safe" value is the value with any bindings made readable
  // If there is no value set, any default value is used
  const getSafeValue = (value, defaultValue, bindableProperties) => {
    const enriched = runtimeToReadableBinding(bindableProperties, value)
    return enriched == null && defaultValue !== undefined
      ? defaultValue
      : enriched
  }
</script>

<div class="property-control" bind:this={anchor}>
  <div class="label">{label}</div>
  <div data-cy={`${key}-prop-control`} class="control">
    <svelte:component
      this={control}
      {componentInstance}
      value={safeValue}
      on:change={handleChange}
      onChange={handleChange}
      {type}
      {...props}
      name={key} />
  </div>
  {#if bindable && !key.startsWith('_') && type === 'text'}
    <div
      class="icon"
      data-cy={`${key}-binding-button`}
      on:click={bindingDrawer.show}>
      <Icon name="lightning" />
    </div>
    <Drawer bind:this={bindingDrawer} title={capitalise(key)}>
      <div slot="description">
        <Body extraSmall grey>
          Add the objects on the left to enrich your text.
        </Body>
      </div>
      <heading slot="buttons">
        <Button thin blue disabled={!valid} on:click={handleClose}>Save</Button>
      </heading>
      <div slot="body">
        <BindingPanel
          bind:valid
          value={safeValue}
          close={handleClose}
          on:update={e => (temporaryBindableValue = e.detail)}
          {bindableProperties} />
      </div>
    </Drawer>
  {/if}
</div>

<style>
  .property-control {
    position: relative;
    display: flex;
    flex-flow: row;
    align-items: center;
  }

  .label {
    display: flex;
    align-items: center;
    font-size: 12px;
    font-weight: 400;
    flex: 0 0 80px;
    text-align: left;
    color: var(--ink);
    margin-right: auto;
    text-transform: capitalize;
  }

  .control {
    flex: 1;
    display: inline-block;
    padding-left: 2px;
    overflow: hidden;
  }

  .icon {
    right: 2px;
    top: 2px;
    bottom: 2px;
    position: absolute;
    align-items: center;
    display: flex;
    box-sizing: border-box;
    padding-left: 7px;
    border-left: 1px solid var(--grey-4);
    background-color: var(--grey-2);
    border-top-right-radius: var(--border-radius-m);
    border-bottom-right-radius: var(--border-radius-m);
    color: var(--grey-7);
    font-size: 14px;
  }
  .icon:hover {
    color: var(--ink);
    cursor: pointer;
  }
</style>
