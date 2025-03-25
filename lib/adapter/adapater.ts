// import { Container, Database } from "@azure/cosmos";
// import { getAuthTables } from "../../db";
// import type { Adapter, BetterAuthOptions, Where } from "../../types";
// import type { FieldAttribute } from "../../db";
// import { withApplyDefault } from "../utils";

// const createTransform = (options: BetterAuthOptions) => {
// 	const schema = getAuthTables(options);
// 	/**
// 	 * if custom id gen is provided we don't want to override with default id
// 	 */
// 	const customIdGen = options.advanced?.generateId;

// 	function serializeID(field: string, value: any, model: string) {
// 		if (customIdGen) {
// 			return value;
// 		}
// 		if (
// 			field === "id" ||
// 			schema[model].fields[field].references?.field === "id"
// 		) {
// 			// Cosmos DB uses string IDs, so we don't need to transform them like MongoDB does
// 			// Just ensure it's a string
// 			if (Array.isArray(value)) {
// 				return value.map((v) => String(v));
// 			}
// 			return String(value);
// 		}
// 		return value;
// 	}

// 	function deserializeID(field: string, value: any, model: string) {
// 		if (customIdGen) {
// 			return value;
// 		}
// 		if (
// 			field === "id" ||
// 			schema[model].fields[field].references?.field === "id"
// 		) {
// 			// Cosmos DB already uses string IDs, so little transformation is needed
// 			if (Array.isArray(value)) {
// 				return value.map((v) => String(v));
// 			}
// 			return String(value);
// 		}
// 		return value;
// 	}

// 	function getField(field: string, model: string) {
// 		if (field === "id") {
// 			// Cosmos DB uses 'id' as its primary key
// 			return "id";
// 		}
// 		const f = schema[model].fields[field];
// 		return f.fieldName || field;
// 	}

// 	return {
// 		transformInput(
// 			data: Record<string, any>,
// 			model: string,
// 			action: "create" | "update",
// 		) {
// 			const transformedData: Record<string, any> =
// 				action === "update"
// 					? {}
// 					: customIdGen
// 						? {
// 								id: customIdGen({ model }),
// 							}
// 						: {
// 								// Generate a unique ID if not provided
// 								id: crypto.randomUUID(),
// 							};
// 			const fields = schema[model].fields;
// 			for (const field in fields) {
// 				const value = data[field];
// 				if (
// 					value === undefined &&
// 					(!fields[field].defaultValue || action === "update")
// 				) {
// 					continue;
// 				}
// 				transformedData[fields[field].fieldName || field] = withApplyDefault(
// 					serializeID(field, value, model),
// 					fields[field],
// 					action,
// 				);
// 			}
// 			return transformedData;
// 		},
// 		transformOutput(
// 			data: Record<string, any>,
// 			model: string,
// 			select: string[] = [],
// 		) {
// 			const transformedData: Record<string, any> =
// 				data.id 
// 					? select.length === 0 || select.includes("id")
// 						? {
// 								id: String(data.id),
// 							}
// 						: {}
// 					: {};

// 			const tableSchema = schema[model].fields;
// 			for (const key in tableSchema) {
// 				if (select.length && !select.includes(key)) {
// 					continue;
// 				}
// 				const field = tableSchema[key];
// 				if (field) {
// 					transformedData[key] = deserializeID(
// 						key,
// 						data[field.fieldName || key],
// 						model,
// 					);
// 				}
// 			}
// 			return transformedData as any;
// 		},
// 		convertWhereClause(where: Where[], model: string) {
// 			if (!where.length) return {};
			
// 			// For CosmosDB, we need to build a SQL-like query
// 			const conditions: string[] = [];
// 			const parameters: Record<string, any> = {};
			
// 			where.forEach((w, index) => {
// 				const { field: _field, value, operator = "eq", connector = "AND" } = w;
// 				const field = getField(_field, model);
// 				const paramName = `@p${index}`;
				
// 				// Add the connector if it's not the first condition
// 				const connectorStr = index > 0 ? ` ${connector} ` : "";
				
// 				let conditionStr = "";
// 				switch (operator.toLowerCase()) {
// 					case "eq":
// 						conditionStr = `${connectorStr}c.${field} = ${paramName}`;
// 						parameters[paramName] = serializeID(_field, value, model);
// 						break;
// 					case "in":
// 						// For 'in' operator, we need to use the ARRAY_CONTAINS function
// 						// but in reverse (item IN array becomes ARRAY_CONTAINS(array, item))
// 						if (Array.isArray(value)) {
// 							// Multiple OR conditions for each value in the array
// 							const inConditions = value.map((val, i) => {
// 								const inParamName = `@p${index}_${i}`;
// 								parameters[inParamName] = serializeID(_field, val, model);
// 								return `c.${field} = ${inParamName}`;
// 							}).join(" OR ");
// 							conditionStr = `${connectorStr}(${inConditions})`;
// 						} else {
// 							conditionStr = `${connectorStr}c.${field} = ${paramName}`;
// 							parameters[paramName] = serializeID(_field, value, model);
// 						}
// 						break;
// 					case "gt":
// 						conditionStr = `${connectorStr}c.${field} > ${paramName}`;
// 						parameters[paramName] = value;
// 						break;
// 					case "gte":
// 						conditionStr = `${connectorStr}c.${field} >= ${paramName}`;
// 						parameters[paramName] = value;
// 						break;
// 					case "lt":
// 						conditionStr = `${connectorStr}c.${field} < ${paramName}`;
// 						parameters[paramName] = value;
// 						break;
// 					case "lte":
// 						conditionStr = `${connectorStr}c.${field} <= ${paramName}`;
// 						parameters[paramName] = value;
// 						break;
// 					case "ne":
// 						conditionStr = `${connectorStr}c.${field} != ${paramName}`;
// 						parameters[paramName] = value;
// 						break;
// 					case "contains":
// 						conditionStr = `${connectorStr}CONTAINS(c.${field}, ${paramName})`;
// 						parameters[paramName] = value;
// 						break;
// 					case "starts_with":
// 						conditionStr = `${connectorStr}STARTSWITH(c.${field}, ${paramName})`;
// 						parameters[paramName] = value;
// 						break;
// 					case "ends_with":
// 						conditionStr = `${connectorStr}ENDSWITH(c.${field}, ${paramName})`;
// 						parameters[paramName] = value;
// 						break;
// 					default:
// 						throw new Error(`Unsupported operator: ${operator}`);
// 				}
				
// 				conditions.push(conditionStr);
// 			});
			
// 			// Combine all conditions
// 			const whereClause = conditions.join(" ");
			
// 			return {
// 				queryText: `SELECT * FROM c WHERE ${whereClause}`,
// 				parameters
// 			};
// 		},
// 		getModelName: (model: string) => {
// 			return schema[model].modelName;
// 		},
// 		getField,
// 	};
// };

// export const cosmosdbAdapter = (db: Database) => (options: BetterAuthOptions) => {
// 	const transform = createTransform(options);
// 	const hasCustomId = options.advanced?.generateId;
// 	const schema = getAuthTables(options);
	
// 	// Helper function to get container for a model
// 	const getContainer = (model: string): Container => {
// 		const containerName = transform.getModelName(model);
// 		return db.container(containerName);
// 	};
	
// 	// Helper function to determine the partition key for a model
// 	// This is configurable based on your Cosmos DB setup
// 	const getPartitionKeyFromModel = (model: string, item: any): string => {
// 		// Default partition key strategy
// 		// You may want to customize this based on your Cosmos DB container configuration
// 		switch(model) {
// 			case 'user':
// 				// Using email as partition key for users (common strategy)
// 				return item.email || item.id;
// 			case 'session':
// 				// Using userId as partition key for sessions
// 				return item.userId || item.id;
// 			case 'account':
// 				// Using userId as partition key for accounts
// 				return item.userId || item.id;
// 			case 'verification':
// 				// Using identifier as partition key for verification
// 				return item.identifier || item.id;
// 			default:
// 				// Default to id
// 				return item.id;
// 		}
// 	};
	
// 	return {
// 		id: "cosmosdb-adapter",
// 		async create(data) {
// 			const { model, data: values, select } = data;
// 			const transformedData = transform.transformInput(values, model, "create");
			
// 			if (!transformedData.id && !hasCustomId) {
// 				transformedData.id = crypto.randomUUID();
// 			}
			
// 			const container = getContainer(model);
// 			const { resource } = await container.items.create(transformedData);
			
// 			if (!resource) {
// 				throw new Error("Failed to create item");
// 			}
			
// 			return transform.transformOutput(resource, model, select);
// 		},
// 		async findOne(data) {
// 			const { model, where, select } = data;
// 			const container = getContainer(model);
			
// 			const { queryText, parameters } = transform.convertWhereClause(where, model);
			
// 			const { resources } = await container.items
// 				.query({
// 					query: queryText,
// 					parameters: Object.entries(parameters).map(([name, value]) => ({ name, value }))
// 				})
// 				.fetchAll();
			
// 			if (!resources || resources.length === 0) return null;
			
// 			return transform.transformOutput(resources[0], model, select);
// 		},
// 		async findMany(data) {
// 			const { model, where, limit, offset, sortBy } = data;
// 			const container = getContainer(model);
			
// 			let queryText = "SELECT * FROM c";
// 			let parameters: { name: string, value: any }[] = [];
			
// 			if (where && where.length > 0) {
// 				const whereClause = transform.convertWhereClause(where, model);
// 				queryText = whereClause.queryText;
// 				parameters = Object.entries(whereClause.parameters).map(([name, value]) => ({ name, value }));
// 			}
			
// 			// Add ORDER BY if sortBy is provided
// 			if (sortBy) {
// 				const direction = sortBy.direction === "desc" ? "DESC" : "ASC";
// 				const field = transform.getField(sortBy.field, model);
// 				queryText += ` ORDER BY c.${field} ${direction}`;
// 			}
			
// 			// Pagination is handled with OFFSET and LIMIT in Cosmos DB
// 			if (offset) {
// 				queryText += ` OFFSET ${offset}`;
// 			}
			
// 			if (limit) {
// 				queryText += ` LIMIT ${limit}`;
// 			}
			
// 			const { resources } = await container.items
// 				.query({
// 					query: queryText,
// 					parameters
// 				})
// 				.fetchAll();
			
// 			if (!resources) return [];
			
// 			return resources.map(r => transform.transformOutput(r, model));
// 		},
// 		async count(data) {
// 			const { model } = data;
// 			const container = getContainer(model);
			
// 			const { resources } = await container.items
// 				.query({
// 					query: "SELECT VALUE COUNT(1) FROM c"
// 				})
// 				.fetchAll();
			
// 			return resources && resources.length > 0 ? resources[0] : 0;
// 		},
// 		async update(data) {
// 			const { model, where, update: values } = data;
// 			const container = getContainer(model);
			
// 			// First, find the item to update
// 			const { queryText, parameters } = transform.convertWhereClause(where, model);
			
// 			const { resources } = await container.items
// 				.query({
// 					query: queryText,
// 					parameters: Object.entries(parameters).map(([name, value]) => ({ name, value }))
// 				})
// 				.fetchAll();
			
// 			if (!resources || resources.length === 0) return null;
			
// 			const item = resources[0];
// 			const transformedData = transform.transformInput(values, model, "update");
			
// 			// Merge the existing item with update data
// 			const updatedItem = { ...item, ...transformedData };
			
// 			// In Cosmos DB, we need the id and partitionKey to update an item
// 			// Note: For Cosmos DB, the partitionKey might be different from id depending on your container setup
// 			// The partition key should match what's configured in your Cosmos DB container
// 			const partitionKey = getPartitionKeyFromModel(model, item);
// 			const { resource } = await container.item(item.id, partitionKey).replace(updatedItem);
			
// 			if (!resource) {
// 				throw new Error("Failed to update item");
// 			}
			
// 			return transform.transformOutput(resource, model);
// 		},
// 		async updateMany(data) {
// 			const { model, where, update: values } = data;
// 			const container = getContainer(model);
			
// 			// First, find all items to update
// 			const { queryText, parameters } = transform.convertWhereClause(where, model);
			
// 			const { resources } = await container.items
// 				.query({
// 					query: queryText,
// 					parameters: Object.entries(parameters).map(([name, value]) => ({ name, value }))
// 				})
// 				.fetchAll();
			
// 			if (!resources || resources.length === 0) return 0;
			
// 			const transformedData = transform.transformInput(values, model, "update");
			
// 			// Update each item individually (Cosmos DB doesn't have a native updateMany)
// 			let updatedCount = 0;
// 			for (const item of resources) {
// 				const updatedItem = { ...item, ...transformedData };
// 				try {
// 					const partitionKey = getPartitionKeyFromModel(model, item);
// 					await container.item(item.id, partitionKey).replace(updatedItem);
// 					updatedCount++;
// 				} catch (error) {
// 					console.error(`Failed to update item ${item.id}:`, error);
// 				}
// 			}
			
// 			return updatedCount;
// 		},
// 		async delete(data) {
// 			const { model, where } = data;
// 			const container = getContainer(model);
			
// 			// First, find the item to delete
// 			const { queryText, parameters } = transform.convertWhereClause(where, model);
			
// 			const { resources } = await container.items
// 				.query({
// 					query: queryText,
// 					parameters: Object.entries(parameters).map(([name, value]) => ({ name, value }))
// 				})
// 				.fetchAll();
			
// 			if (!resources || resources.length === 0) return null;
			
// 			const item = resources[0];
// 			const deletedItem = { ...item }; // Save a copy before deletion
			
// 			// In Cosmos DB, we need the id and partitionKey to delete an item
// 			const partitionKey = getPartitionKeyFromModel(model, item);
// 			await container.item(item.id, partitionKey).delete();
			
// 			return transform.transformOutput(deletedItem, model);
// 		},
// 		async deleteMany(data) {
// 			const { model, where } = data;
// 			const container = getContainer(model);
			
// 			// First, find all items to delete
// 			const { queryText, parameters } = transform.convertWhereClause(where, model);
			
// 			const { resources } = await container.items
// 				.query({
// 					query: queryText,
// 					parameters: Object.entries(parameters).map(([name, value]) => ({ name, value }))
// 				})
// 				.fetchAll();
			
// 			if (!resources || resources.length === 0) return 0;
			
// 			// Delete each item individually (Cosmos DB doesn't have a native deleteMany)
// 			let deletedCount = 0;
// 			for (const item of resources) {
// 				try {
// 					const partitionKey = getPartitionKeyFromModel(model, item);
// 					await container.item(item.id, partitionKey).delete();
// 					deletedCount++;
// 				} catch (error) {
// 					console.error(`Failed to delete item ${item.id}:`, error);
// 				}
// 			}
			
// 			return deletedCount;
// 		},
// 	} satisfies Adapter;
// };

export {}