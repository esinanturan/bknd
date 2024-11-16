import {
   IconAlignJustified,
   IconBolt,
   IconCirclesRelation,
   IconSettings
} from "@tabler/icons-react";
import { isDebug } from "core";
import type { Entity } from "data";
import { cloneDeep, omit } from "lodash-es";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { TbArrowLeft, TbDots } from "react-icons/tb";
import { useBknd } from "ui/client";
import { useBkndData } from "ui/client/schema/data/use-bknd-data";
import { Button } from "ui/components/buttons/Button";
import { IconButton } from "ui/components/buttons/IconButton";
import { Empty } from "ui/components/display/Empty";
import {
   JsonSchemaForm,
   type JsonSchemaFormRef
} from "ui/components/form/json-schema/JsonSchemaForm";
import { Dropdown } from "ui/components/overlay/Dropdown";
import * as AppShell from "ui/layouts/AppShell/AppShell";
import { SectionHeaderAccordionItem } from "ui/layouts/AppShell/AppShell";
import { Breadcrumbs2 } from "ui/layouts/AppShell/Breadcrumbs2";
import { routes, useGoBack, useNavigate } from "ui/lib/routes";
import { extractSchema } from "../settings/utils/schema";
import { EntityFieldsForm, type EntityFieldsFormRef } from "./forms/entity.fields.form";

export function DataSchemaEntity({ params }) {
   const { $data } = useBkndData();
   const [value, setValue] = useState("fields");
   const fieldsRef = useRef<EntityFieldsFormRef>(null);

   function toggle(value) {
      return () => setValue(value);
   }

   const [navigate] = useNavigate();
   const entity = $data.entity(params.entity as string)!;

   return (
      <>
         <AppShell.SectionHeader
            right={
               <>
                  <Dropdown
                     items={[
                        {
                           label: "Settings",
                           onClick: () =>
                              navigate(routes.settings.path(["data", "entities", entity.name]), {
                                 absolute: true
                              })
                        }
                     ]}
                     position="bottom-end"
                  >
                     <IconButton Icon={TbDots} />
                  </Dropdown>
               </>
            }
            className="pl-3"
         >
            <Breadcrumbs2
               path={[{ label: "Schema", href: "/" }, { label: entity.label }]}
               backTo="/"
            />
         </AppShell.SectionHeader>
         <div className="flex flex-col h-full" key={entity.name}>
            <Fields entity={entity} open={value === "fields"} toggle={toggle("fields")} />

            <BasicSettings entity={entity} open={value === "2"} toggle={toggle("2")} />
            <AppShell.SectionHeaderAccordionItem
               title="Relations"
               open={value === "3"}
               toggle={toggle("3")}
               ActiveIcon={IconCirclesRelation}
            >
               <Empty
                  title="Relations"
                  description="This will soon be available here. Meanwhile, check advanced settings."
                  buttonText="Advanced Settings"
                  buttonOnClick={() =>
                     navigate(routes.settings.path(["data", "relations"]), {
                        absolute: true
                     })
                  }
               />
            </AppShell.SectionHeaderAccordionItem>
            <AppShell.SectionHeaderAccordionItem
               title="Indices"
               open={value === "4"}
               toggle={toggle("4")}
               ActiveIcon={IconBolt}
            >
               <Empty
                  title="Indices"
                  description="This will soon be available here. Meanwhile, check advanced settings."
                  buttonText="Advanced Settings"
                  buttonOnClick={() =>
                     navigate(routes.settings.path(["data", "indices"]), {
                        absolute: true
                     })
                  }
               />
            </AppShell.SectionHeaderAccordionItem>
         </div>
      </>
   );
}

const Fields = ({
   entity,
   open,
   toggle
}: { entity: Entity; open: boolean; toggle: () => void }) => {
   const [submitting, setSubmitting] = useState(false);
   const [updates, setUpdates] = useState(0);
   const { actions } = useBkndData();
   const [res, setRes] = useState<any>();
   const ref = useRef<EntityFieldsFormRef>(null);
   async function handleUpdate() {
      if (submitting) return;
      setSubmitting(true);
      const fields = ref.current?.getData()!;
      await actions.entity.patch(entity.name).fields.set(fields);
      setSubmitting(false);
      setUpdates((u) => u + 1);
   }

   // @todo: the return of toJSON from Fields doesn't match "type" enum
   const initialFields = Object.fromEntries(entity.fields.map((f) => [f.name, f.toJSON()])) as any;

   return (
      <AppShell.SectionHeaderAccordionItem
         title="Fields"
         open={open}
         toggle={toggle}
         ActiveIcon={IconAlignJustified}
         renderHeaderRight={({ open }) =>
            open ? (
               <Button variant="primary" disabled={!open} onClick={handleUpdate}>
                  Update
               </Button>
            ) : null
         }
      >
         <div className="flex flex-col flex-grow py-3 px-4 max-w-4xl gap-3 relative">
            {submitting && (
               <div className="animate-fade-in absolute w-full h-full top-0 bottom-0 left-0 right-0 bg-background/65 z-50" />
            )}
            <EntityFieldsForm fields={initialFields} ref={ref} key={String(updates)} sortable />

            {isDebug() && (
               <div>
                  <div className="flex flex-row gap-1 justify-center">
                     <Button size="small" onClick={() => setRes(ref.current?.isValid())}>
                        valid
                     </Button>
                     <Button size="small" onClick={() => setRes(ref.current?.getValues())}>
                        values
                     </Button>
                     <Button size="small" onClick={() => setRes(ref.current?.getData())}>
                        data
                     </Button>
                     <Button size="small" onClick={handleUpdate}>
                        update
                     </Button>
                  </div>

                  <pre className="select-text">{JSON.stringify(res, null, 2)}</pre>
               </div>
            )}
         </div>
      </AppShell.SectionHeaderAccordionItem>
   );
};

const BasicSettings = ({
   entity,
   open,
   toggle
}: { entity: Entity; open: boolean; toggle: () => void }) => {
   const d = useBkndData();
   const config = d.entities?.[entity.name]?.config;
   const formRef = useRef<JsonSchemaFormRef>(null);

   const schema = cloneDeep(
      // @ts-ignore
      d.schema.properties.entities.additionalProperties?.properties?.config
   );

   const [_schema, _config] = extractSchema(schema as any, config, ["fields"]);

   // set fields as enum
   try {
      // @ts-ignore
      _schema.properties.sort_field.enum = entity.getFields().map((f) => f.name);
   } catch (e) {
      console.error("error setting sort_field enum", e);
   }

   async function handleUpdate() {
      console.log("update", formRef.current?.formData());
      await d.actions.entity.patch(entity.name).config(formRef.current?.formData());
   }

   return (
      <AppShell.SectionHeaderAccordionItem
         title="Settings"
         open={open}
         toggle={toggle}
         ActiveIcon={IconSettings}
         renderHeaderRight={({ open }) =>
            open ? (
               <Button variant="primary" disabled={!open} onClick={handleUpdate}>
                  Update
               </Button>
            ) : null
         }
      >
         <div className="flex flex-col flex-grow py-3 px-4 max-w-4xl gap-3 relative">
            <JsonSchemaForm
               ref={formRef}
               schema={_schema}
               formData={_config}
               onSubmit={console.log}
               className="legacy hide-required-mark fieldset-alternative mute-root"
            />
         </div>
      </AppShell.SectionHeaderAccordionItem>
   );
};
