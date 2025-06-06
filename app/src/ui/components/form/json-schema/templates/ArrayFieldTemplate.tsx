import {
   type ArrayFieldTemplateItemType,
   type ArrayFieldTemplateProps,
   type FormContextType,
   type RJSFSchema,
   type StrictRJSFSchema,
   getTemplate,
   getUiOptions,
} from "@rjsf/utils";
import { cloneElement } from "react";

/** The `ArrayFieldTemplate` component is the template used to render all items in an array.
 *
 * @param props - The `ArrayFieldTemplateItemType` props for the component
 */
export default function ArrayFieldTemplate<
   T = any,
   S extends StrictRJSFSchema = RJSFSchema,
   F extends FormContextType = any,
>(props: ArrayFieldTemplateProps<T, S, F>) {
   const {
      canAdd,
      className,
      disabled,
      idSchema,
      uiSchema,
      items,
      onAddClick,
      readonly,
      registry,
      required,
      schema,
      title,
   } = props;
   const uiOptions = getUiOptions<T, S, F>(uiSchema);
   const ArrayFieldDescriptionTemplate = getTemplate<"ArrayFieldDescriptionTemplate", T, S, F>(
      "ArrayFieldDescriptionTemplate",
      registry,
      uiOptions,
   );
   const ArrayFieldItemTemplate = getTemplate<"ArrayFieldItemTemplate", T, S, F>(
      "ArrayFieldItemTemplate",
      registry,
      uiOptions,
   );
   const ArrayFieldTitleTemplate = getTemplate<"ArrayFieldTitleTemplate", T, S, F>(
      "ArrayFieldTitleTemplate",
      registry,
      uiOptions,
   );
   // Button templates are not overridden in the uiSchema
   const {
      ButtonTemplates: { AddButton },
   } = registry.templates;
   return (
      <fieldset className={className} id={idSchema.$id}>
         <ArrayFieldTitleTemplate
            idSchema={idSchema}
            title={uiOptions.title || title}
            required={required}
            schema={schema}
            uiSchema={uiSchema}
            registry={registry}
         />
         <ArrayFieldDescriptionTemplate
            idSchema={idSchema}
            description={uiOptions.description || schema.description}
            schema={schema}
            uiSchema={uiSchema}
            registry={registry}
         />
         {items && items.length > 0 && (
            <div className="flex flex-col gap-3 array-items">
               {items.map(
                  ({ key, children, ...itemProps }: ArrayFieldTemplateItemType<T, S, F>) => {
                     const newChildren = cloneElement(children, {
                        // @ts-ignore
                        ...children.props,
                        name: undefined,
                        title: undefined,
                     });

                     return (
                        <ArrayFieldItemTemplate key={key} {...itemProps} children={newChildren} />
                     );
                  },
               )}
            </div>
         )}
         {canAdd && (
            <AddButton
               className="array-item-add"
               onClick={onAddClick}
               disabled={disabled || readonly}
               uiSchema={uiSchema}
               registry={registry}
            />
         )}
      </fieldset>
   );
}
