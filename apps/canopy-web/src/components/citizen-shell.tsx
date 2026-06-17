import React from "react";
import Link from "next/link";
import type { CitizenCanopyModel } from "../lib/citizen-data";

export function CitizenShell({ model }: { readonly model: CitizenCanopyModel }) {
  const activeContext = model.activeContext;
  const isReportRoute = model.routePath === "/citizen/report";
  const isNeedsOffersRoute = model.routePath === "/citizen/needs-offers";
  const isDecisionsRoute = model.routePath === "/citizen/decisions";
  const isTrustDataRoute = model.routePath === "/citizen/trust-data";
  const isReleaseReadinessRoute = model.routePath === "/citizen/release-readiness";
  const isReviewQueueRoute = model.routePath === "/citizen/review-queue";
  const isTaskSurfaceRoute = ["/citizen/today", "/citizen/contexts", "/citizen/around", "/citizen/search"].includes(
    model.routePath
  );

  return (
    <main className="citizenShell">
      <section className="citizenHero" aria-labelledby="citizen-title">
        <p className="eyebrow">Phase 11</p>
        <h1 id="citizen-title">{model.surfaceLabel}</h1>
        <p>{model.summary}</p>
        <Link href={model.primaryAction.route} className="citizenPrimaryAction">
          {model.primaryAction.label}
        </Link>
      </section>

      <nav className="citizenTaskNav" aria-label="Citizen task navigation">
        {model.taskNavigation.map((item) => (
          <Link href={item.route} className="citizenTaskLink" key={item.id}>
            <span>{item.label}</span>
            <small>{item.question}</small>
            {item.attentionCount === undefined ? null : <strong>{item.attentionCount}</strong>}
          </Link>
        ))}
      </nav>

      <nav className="citizenMobileTaskNav" aria-label="Mobile citizen tasks">
        {model.mobileTaskRoutes.map((item) => (
          <Link href={item.route} className="citizenMobileTaskLink" key={item.id}>
            {item.label}
          </Link>
        ))}
      </nav>

      {isReportRoute ? (
        renderCitizenReportFlow(model)
      ) : isNeedsOffersRoute ? (
        renderNeedsOffers(model)
      ) : isDecisionsRoute ? (
        renderDecisions(model)
      ) : isTrustDataRoute ? (
        renderTrustData(model)
      ) : isReleaseReadinessRoute ? (
        renderReleaseReadiness(model)
      ) : isReviewQueueRoute ? (
        renderReviewQueue(model)
      ) : isTaskSurfaceRoute ? (
        renderTaskSurface(model)
      ) : (
      <section className="citizenHomeGrid" aria-label="Citizen home">
        <article className="citizenPanel citizenActiveContext">
          <p className="eyebrow">Active context</p>
          <h2>{activeContext.label}</h2>
          <dl className="citizenContextFacts">
            <div>
              <dt>Role</dt>
              <dd>{activeContext.activeRole}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{activeContext.level}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{activeContext.dataPosture}</dd>
            </div>
          </dl>
          <p>{activeContext.authoritySummary}</p>
          <p className="citizenPath">{activeContext.relationshipPath.join(" / ")}</p>
        </article>

        <article className="citizenPanel">
          <p className="eyebrow">Top attention</p>
          <h2>Top attention</h2>
          <div className="citizenAttentionList">
            {model.activeAttentionItems.map((item) => (
              <Link href={item.route} className="citizenAttentionItem" key={item.id}>
                <span>{item.urgency}</span>
                <strong>{item.label}</strong>
                <small>{item.summary}</small>
              </Link>
            ))}
          </div>
        </article>

        <article className="citizenPanel">
          <p className="eyebrow">Suggested actions</p>
          <h2>Suggested actions</h2>
          <div className="citizenActionList">
            {model.suggestedActions.map((action) => (
              <Link href={action.route} className="citizenActionLink" key={action.id}>
                {action.label}
              </Link>
            ))}
          </div>
        </article>

        <article className="citizenPanel citizenContextsPanel">
          <p className="eyebrow">Groups and levels</p>
          <h2>My Contexts</h2>
          <div className="citizenContextList">
            {model.contexts.map((context) => (
              <Link
                href={`/citizen?context=${encodeURIComponent(context.id)}`}
                className={
                  context.id === activeContext.id
                    ? "citizenContextItem active"
                    : "citizenContextItem"
                }
                key={context.id}
              >
                <span>{context.level}</span>
                <strong>{context.label}</strong>
                <small>{context.activeRole}</small>
                <em>{context.attentionCount}</em>
              </Link>
            ))}
          </div>
        </article>
      </section>
      )}
    </main>
  );
}

function renderReviewQueue(model: CitizenCanopyModel) {
  const selectedCommand = model.commandCenter.selectedCommand;

  return (
    <section className="citizenWorkflowGrid" aria-label="Review queue">
      <article className="citizenPanel citizenWorkflowPrimary">
        <p className="eyebrow">Review queue</p>
        <h2>Review queue</h2>
        <p>{model.commandCenter.queueSummary}</p>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Saved drafts</p>
        <h2>Saved drafts</h2>
        {renderCommandList(model.commandCenter.savedDrafts)}
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Submitted</p>
        <h2>Submitted commands</h2>
        {renderCommandList(model.commandCenter.submittedCommands)}
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Needs review</p>
        <h2>Needs review</h2>
        {renderCommandList(model.commandCenter.reviewQueue)}
      </article>

      {selectedCommand === undefined ? null : (
        <article className="citizenPanel citizenWorkflowPreview">
          <p className="eyebrow">Selected command</p>
          <h2>{selectedCommand.label}</h2>
          <dl className="citizenReportPreviewList">
            <div>
              <dt>Review owner</dt>
              <dd>{selectedCommand.reviewOwner}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{selectedCommand.status}</dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>{selectedCommand.visibility}</dd>
            </div>
            <div>
              <dt>Civic memory</dt>
              <dd>{selectedCommand.civicMemoryEffect}</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>{selectedCommand.dueLabel}</dd>
            </div>
          </dl>
          <div className="citizenActionList">
            <Link href={selectedCommand.route} className="citizenActionLink">
              {selectedCommand.reviewActionLabel}
            </Link>
          </div>
        </article>
      )}
    </section>
  );
}

function renderCommandList(commands: CitizenCanopyModel["commandCenter"]["savedDrafts"]) {
  if (commands.length === 0) {
    return <p>No work waiting here.</p>;
  }

  return (
    <ul className="citizenPlainList">
      {commands.map((command) => (
        <li key={command.id}>
          <Link href={command.route}>{command.label}</Link>
          <span>{command.reviewOwner}</span>
        </li>
      ))}
    </ul>
  );
}

function renderTaskSurface(model: CitizenCanopyModel) {
  const taskSurface = model.taskSurface;

  return (
    <section className="citizenWorkflowGrid" aria-label={taskSurface.label}>
      <article className="citizenPanel citizenWorkflowPrimary">
        <p className="eyebrow">Citizen task</p>
        <h2>{taskSurface.label}</h2>
        <p>{taskSurface.summary}</p>
      </article>

      <article className="citizenPanel citizenWorkflowPreview">
        <p className="eyebrow">Active role</p>
        <h2>{model.activeContext.activeRole}</h2>
        <p>{model.activeContext.authoritySummary}</p>
        <dl className="citizenContextFacts">
          <div>
            <dt>Context</dt>
            <dd>{model.activeContext.label}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{model.activeContext.dataPosture}</dd>
          </div>
        </dl>
      </article>

      {model.routePath === "/citizen/contexts" ? renderRoleSwitchPanel(model) : null}

      {taskSurface.items.map((item) => (
        <Link href={item.route} className="citizenPanel citizenTaskSurfaceItem" key={item.id}>
          <p className="eyebrow">{item.contextLabel ?? "task"}</p>
          <h2>{item.label}</h2>
          <p>{item.summary}</p>
        </Link>
      ))}

      {model.suggestedActions.length === 0 ? null : (
        <article className="citizenPanel">
          <p className="eyebrow">Available now</p>
          <h2>Suggested actions</h2>
          <div className="citizenActionList">
            {model.suggestedActions.map((action) => (
              <Link href={action.route} className="citizenActionLink" key={action.id}>
                {action.label}
              </Link>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}

function renderRoleSwitchPanel(model: CitizenCanopyModel) {
  return (
    <article className="citizenPanel">
      <p className="eyebrow">Roles</p>
      <h2>Switch role</h2>
      <div className="citizenActionList">
        {model.activeContext.availableRoles.map((role) => (
          <Link
            href={`/citizen/contexts?context=${encodeURIComponent(model.activeContext.id)}&role=${encodeURIComponent(role)}`}
            className="citizenActionLink"
            key={role}
          >
            {role}
          </Link>
        ))}
      </div>
    </article>
  );
}

function renderReleaseReadiness(model: CitizenCanopyModel) {
  const readiness = model.releaseReadiness;

  if (!model.releaseReadinessAccess.allowed) {
    return (
      <section className="citizenWorkflowGrid" aria-label="Release readiness access">
        <article className="citizenPanel citizenWorkflowPrimary">
          <p className="eyebrow">Release Readiness</p>
          <h2>Operator access needed</h2>
          <p>{model.releaseReadinessAccess.reason}</p>
        </article>
      </section>
    );
  }

  return (
    <section className="citizenWorkflowGrid" aria-label="Release readiness">
      <article className="citizenPanel citizenWorkflowPrimary">
        <p className="eyebrow">Release Readiness</p>
        <h2>Release Readiness</h2>
        <dl className="citizenContextFacts">
          <div>
            <dt>Local acceptance</dt>
            <dd>{readiness.localAcceptanceStatus}</dd>
          </div>
          <div>
            <dt>Live deployment</dt>
            <dd>{readiness.liveDeploymentStatus}</dd>
          </div>
          <div>
            <dt>Next actions</dt>
            <dd>{readiness.nextActions.length}</dd>
          </div>
        </dl>
      </article>

      {renderBlockerPanel("Provider blockers", readiness.providerBlockers)}
      {renderBlockerPanel("Migration blockers", readiness.migrationBlockers)}
      {renderBlockerPanel("Environment blockers", readiness.environmentBlockers)}
      {renderBlockerPanel("Observability blockers", readiness.observabilityBlockers)}
      {renderBlockerPanel("Verification blockers", readiness.verificationBlockers)}

      <article className="citizenPanel citizenWorkflowPreview">
        <p className="eyebrow">Operator next actions</p>
        <h2>Next actions</h2>
        <ul className="citizenPlainList">
          {readiness.nextActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}

function renderBlockerPanel(title: string, blockers: readonly string[]) {
  return (
    <article className="citizenPanel" key={title}>
      <p className="eyebrow">Live blocker</p>
      <h2>{title}</h2>
      <ul className="citizenPlainList">
        {blockers.map((blocker) => (
          <li key={blocker}>{blocker}</li>
        ))}
      </ul>
    </article>
  );
}

function renderTrustData(model: CitizenCanopyModel) {
  if (model.publicObserver.enabled) {
    return renderPublicObserver(model);
  }

  const conflict = model.federationConflictReview;

  return (
    <section className="citizenWorkflowGrid" aria-label="Trust and data">
      <article className="citizenPanel citizenWorkflowPrimary">
        <p className="eyebrow">Trust & Data</p>
        <h2>Review downstream record conflict</h2>
        <dl className="citizenContextFacts">
          <div>
            <dt>Peer</dt>
            <dd>{conflict.peerSource}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{conflict.trustStatus}</dd>
          </div>
          <div>
            <dt>Domain</dt>
            <dd>{conflict.domain}</dd>
          </div>
        </dl>
        <p>{conflict.conflictReason}</p>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Local record</p>
        <h2>Riverbend record</h2>
        <p>{conflict.localRecordSummary}</p>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Peer record</p>
        <h2>{conflict.peerSource}</h2>
        <p>{conflict.remoteRecordSummary}</p>
      </article>

      <article className="citizenPanel citizenWorkflowPreview">
        <p className="eyebrow">Resolution preview</p>
        <h2>{conflict.proposedAction}</h2>
        <dl className="citizenReportPreviewList">
          <div>
            <dt>Available actions</dt>
            <dd>{conflict.availableActions.join(", ")}</dd>
          </div>
          <div>
            <dt>Provenance</dt>
            <dd>{conflict.provenanceSummary}</dd>
          </div>
          <div>
            <dt>Redaction continuity</dt>
            <dd>{conflict.redactionContinuitySummary}</dd>
          </div>
        </dl>
      </article>

      <article className="citizenPanel citizenWorkflowPreview">
        <p className="eyebrow">Recommendation</p>
        <h2>Recommended next step</h2>
        <p>{conflict.recommendationRationale}</p>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Consequences</p>
        <h2>Action consequences</h2>
        <ul className="citizenPlainList">
          {conflict.consequencePreviews.map((preview) => (
            <li key={preview.action}>
              <strong>{preview.action}</strong>
              <span>{preview.consequence}</span>
            </li>
          ))}
        </ul>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Precedent</p>
        <h2>Related civic memory</h2>
        <div className="citizenActionList">
          {conflict.precedentLinks.map((link) => (
            <Link href={link.route} className="citizenActionLink" key={link.route}>
              {link.label}
            </Link>
          ))}
        </div>
      </article>

      {renderLifecycle(conflict.lifecycle)}
    </section>
  );
}

function renderPublicObserver(model: CitizenCanopyModel) {
  const observer = model.publicObserver;

  return (
    <section className="citizenWorkflowGrid" aria-label="Public observer">
      <article className="citizenPanel citizenWorkflowPrimary">
        <p className="eyebrow">Public observer</p>
        <h2>Public observer</h2>
        <p>Public records are visible here. Restricted records stay protected with plain-language explanations.</p>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Visible categories</p>
        <h2>Visible records</h2>
        <ul className="citizenPlainList">
          {observer.visibleRecords.map((record) => (
            <li key={record}>{record}</li>
          ))}
        </ul>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Browse records</p>
        <h2>Public record detail</h2>
        <ul className="citizenPlainList">
          {observer.publicRecords.map((record) => (
            <li key={record.id}>
              <Link href={record.route}>{record.label}</Link>
              <span>{record.summary}</span>
            </li>
          ))}
        </ul>
      </article>

      {observer.selectedRecord === undefined ? null : (
        <article className="citizenPanel citizenWorkflowPreview">
          <p className="eyebrow">Selected record</p>
          <h2>{observer.selectedRecord.label}</h2>
          <dl className="citizenReportPreviewList">
            <div>
              <dt>Visibility</dt>
              <dd>{observer.selectedRecord.visibility}</dd>
            </div>
            <div>
              <dt>Summary</dt>
              <dd>{observer.selectedRecord.summary}</dd>
            </div>
            {observer.selectedRecord.redactionExplanation === undefined ? null : (
              <div>
                <dt>Redaction</dt>
                <dd>{observer.selectedRecord.redactionExplanation}</dd>
              </div>
            )}
          </dl>
        </article>
      )}

      <article className="citizenPanel">
        <p className="eyebrow">Redaction explanations</p>
        <h2>Redaction explanations</h2>
        <ul className="citizenPlainList">
          {observer.redactionExplanations.map((explanation) => (
            <li key={explanation}>{explanation}</li>
          ))}
        </ul>
      </article>

      <article className="citizenPanel citizenWorkflowPreview">
        <p className="eyebrow">Restricted commands</p>
        <h2>Restricted commands unavailable</h2>
        <ul className="citizenPlainList">
          {observer.unavailableCommands.map((command) => (
            <li key={command}>{command} unavailable</li>
          ))}
        </ul>
      </article>
    </section>
  );
}

function renderDecisions(model: CitizenCanopyModel) {
  const decision = model.decisionSummary;
  const challenge = model.challengeAppealPreview;

  return (
    <section className="citizenWorkflowGrid" aria-label="Decisions">
      <article className="citizenPanel citizenWorkflowPrimary">
        <p className="eyebrow">Decisions</p>
        <h2>{decision.question}</h2>
        <dl className="citizenContextFacts">
          <div>
            <dt>Status</dt>
            <dd>{decision.status}</dd>
          </div>
          <div>
            <dt>Method</dt>
            <dd>{decision.decisionMethod}</dd>
          </div>
          <div>
            <dt>Affected contexts</dt>
            <dd>{decision.affectedContextIds.length}</dd>
          </div>
        </dl>
        <p>{decision.guardianReviewSummary}</p>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Options</p>
        <h2>Options</h2>
        <ul className="citizenPlainList">
          {decision.options.map((option) => (
            <li key={option}>{option}</li>
          ))}
        </ul>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Evidence</p>
        <h2>Evidence</h2>
        <ul className="citizenPlainList">
          {decision.evidenceSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <article className="citizenPanel citizenWorkflowPreview">
        <p className="eyebrow">Objections and appeal</p>
        <h2>Objections and appeal path</h2>
        <ul className="citizenPlainList">
          {decision.unresolvedObjections.map((objection) => (
            <li key={objection}>{objection}</li>
          ))}
        </ul>
        <p>{decision.appealPath}</p>
      </article>

      <article className="citizenPanel citizenWorkflowPreview">
        <p className="eyebrow">Challenge or appeal</p>
        <h2>{challenge.label}</h2>
        <p>{challenge.detail}</p>
        <dl className="citizenReportPreviewList">
          <div>
            <dt>Reviewer</dt>
            <dd>{challenge.reviewer}</dd>
          </div>
          <div>
            <dt>Routing</dt>
            <dd>{challenge.routing}</dd>
          </div>
          <div>
            <dt>Visibility</dt>
            <dd>{challenge.visibility}</dd>
          </div>
          <div>
            <dt>Civic memory</dt>
            <dd>{challenge.civicMemoryEffect}</dd>
          </div>
        </dl>
        <ul className="citizenPlainList">
          {challenge.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <p>{challenge.requestedRemedy}</p>
      </article>
    </section>
  );
}

function renderNeedsOffers(model: CitizenCanopyModel) {
  const overview = model.needsOffers;
  const selectedNeed = overview.unmatchedNeeds.find((need) => need.id === overview.selectedNeedId);
  const selectedOffer = overview.availableOffers.find((offer) => offer.id === overview.selectedOfferId);

  return (
    <section className="citizenWorkflowGrid" aria-label="Needs and offers">
      <article className="citizenPanel">
        <p className="eyebrow">Needs & Offers</p>
        <h2>Unmatched needs</h2>
        <div className="citizenAttentionList">
          {overview.unmatchedNeeds.map((need) => (
            <div className="citizenAttentionItem" key={need.id}>
              <span>{need.urgency}</span>
              <strong>{need.label}</strong>
              <small>{need.contextLabel}</small>
              <small>{need.summary}</small>
            </div>
          ))}
        </div>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Needs & Offers</p>
        <h2>Available offers</h2>
        <div className="citizenAttentionList">
          {overview.availableOffers.map((offer) => (
            <div className="citizenAttentionItem" key={offer.id}>
              <span>{offer.urgency}</span>
              <strong>{offer.label}</strong>
              <small>{offer.contextLabel}</small>
              <small>{offer.summary}</small>
            </div>
          ))}
        </div>
      </article>

      <article className="citizenPanel citizenWorkflowPreview">
        <p className="eyebrow">Match preview</p>
        <h2>
          {selectedNeed?.label ?? "Selected need"} with {selectedOffer?.label ?? "selected offer"}
        </h2>
        <dl className="citizenReportPreviewList">
          <div>
            <dt>Timing</dt>
            <dd>{overview.matchPreview.timing}</dd>
          </div>
          <div>
            <dt>Eligibility</dt>
            <dd>{overview.matchPreview.eligibility}</dd>
          </div>
          <div>
            <dt>Authority</dt>
            <dd>{overview.matchPreview.authoritySummary}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{overview.matchPreview.dataPosture}</dd>
          </div>
          <div>
            <dt>Ecological constraints</dt>
            <dd>{overview.matchPreview.ecologicalConstraints.join(", ")}</dd>
          </div>
          <div>
            <dt>Follow-through</dt>
            <dd>{overview.matchPreview.followThroughStates.join(" -> ")}</dd>
          </div>
        </dl>
      </article>

      <article className="citizenPanel citizenWorkflowPreview">
        <p className="eyebrow">Submit match</p>
        <h2>Submit match</h2>
        <form className="citizenForm" method="get" action="/citizen/needs-offers">
          <input type="hidden" name="action" value="submit-match" />
          <label>
            <span>Choose a need</span>
            <select name="need" defaultValue={overview.selectedNeedId}>
              {overview.unmatchedNeeds.map((need) => (
                <option value={need.id} key={need.id}>
                  {need.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Choose an offer</span>
            <select name="offer" defaultValue={overview.selectedOfferId}>
              {overview.availableOffers.map((offer) => (
                <option value={offer.id} key={offer.id}>
                  {offer.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="citizenActionLink">
            Submit match
          </button>
        </form>
      </article>

      {renderLifecycle(overview.lifecycle)}
      {renderCommandActionResult(model)}
    </section>
  );
}

function renderCitizenReportFlow(model: CitizenCanopyModel) {
  const draft = model.reportConcernDraft;

  return (
    <section className="citizenReportGrid" aria-label="Report something">
      <article className="citizenPanel citizenReportForm">
        <p className="eyebrow">Report something</p>
        <h2>Report something</h2>
        <div className="citizenPromptBlock">
          <span>Description</span>
          <strong>{draft.descriptionPrompt}</strong>
          <small>Use everyday language. The review preview updates before anything is submitted.</small>
        </div>
        <dl className="citizenContextFacts">
          <div>
            <dt>Selected context</dt>
            <dd>{draft.contextLabel}</dd>
          </div>
          <div>
            <dt>Urgency</dt>
            <dd>{draft.urgency}</dd>
          </div>
          <div>
            <dt>Visibility</dt>
            <dd>{draft.visibilityPreference}</dd>
          </div>
        </dl>
        <div className="citizenReportAffected">
          <span>Affected people or resources</span>
          <div>
            {draft.affectedPeopleOrResources.map((item) => (
              <strong key={item}>{item}</strong>
            ))}
          </div>
        </div>
        <form className="citizenForm" method="get" action="/citizen/report">
          <input type="hidden" name="action" value="save-report-draft" />
          <label>
            <span>Describe what happened</span>
            <textarea
              name="description"
              defaultValue=""
              rows={4}
              placeholder="What should reviewers know?"
            />
          </label>
          <button type="submit" className="citizenActionLink">
            Save draft
          </button>
        </form>
      </article>

      <article className="citizenPanel">
        <p className="eyebrow">Related records</p>
        <h2>Related records</h2>
        <div className="citizenAttentionList">
          {draft.relatedSuggestions.map((suggestion) => (
            <Link href={suggestion.route} className="citizenAttentionItem" key={suggestion.id}>
              <span>possible match</span>
              <strong>{suggestion.label}</strong>
              <small>{suggestion.summary}</small>
            </Link>
          ))}
        </div>
      </article>

      <article className="citizenPanel citizenReportPreview">
        <p className="eyebrow">Review preview</p>
        <h2>Review preview</h2>
        <dl className="citizenReportPreviewList">
          <div>
            <dt>Reviewer</dt>
            <dd>{draft.preview.reviewOwner}</dd>
          </div>
          <div>
            <dt>Visibility</dt>
            <dd>{draft.preview.visibilityEffect}</dd>
          </div>
          <div>
            <dt>Civic memory</dt>
            <dd>{draft.preview.civicMemoryEffect}</dd>
          </div>
          <div>
            <dt>Possible decision path</dt>
            <dd>{draft.preview.possibleDecisionPath}</dd>
          </div>
        </dl>
      </article>

      {renderLifecycle(draft.lifecycle)}
      {renderCommandActionResult(model)}
    </section>
  );
}

function renderCommandActionResult(model: CitizenCanopyModel) {
  const actionResult = model.commandCenter.actionResult;
  const selectedCommand = model.commandCenter.selectedCommand;

  if (actionResult === undefined || selectedCommand === undefined) {
    return null;
  }

  return (
    <article className="citizenPanel citizenWorkflowPreview">
      <p className="eyebrow">Command record</p>
      <h2>{actionResult.label}</h2>
      <p>{actionResult.summary}</p>
      <dl className="citizenReportPreviewList">
        <div>
          <dt>Command</dt>
          <dd>{selectedCommand.label}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{selectedCommand.status}</dd>
        </div>
        <div>
          <dt>Review owner</dt>
          <dd>{selectedCommand.reviewOwner}</dd>
        </div>
      </dl>
      <div className="citizenActionList">
        <Link href={selectedCommand.route} className="citizenActionLink">
          Open review queue
        </Link>
      </div>
    </article>
  );
}

function renderLifecycle(lifecycle: CitizenCanopyModel["reportConcernDraft"]["lifecycle"]) {
  return (
    <article className="citizenPanel citizenWorkflowPreview">
      <p className="eyebrow">Workflow state</p>
      <h2>{labelWorkflowStep(lifecycle.currentStep)}</h2>
      <p>{lifecycle.confirmationSummary}</p>
      <dl className="citizenReportPreviewList">
        <div>
          <dt>Lifecycle</dt>
          <dd>{lifecycle.steps.map(labelWorkflowStep).join(" -> ")}</dd>
        </div>
        <div>
          <dt>Next action</dt>
          <dd>{lifecycle.nextActionLabel}</dd>
        </div>
      </dl>
      <div className="citizenActionList">
        {lifecycle.availableCommands.map((command) => (
          <Link href={command.route} className="citizenActionLink" key={command.label}>
            {command.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

function labelWorkflowStep(step: string): string {
  return step
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
